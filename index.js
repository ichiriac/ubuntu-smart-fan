#!/usr/bin/env node
const fs = require('fs');
const blessed = require('blessed');
const contrib = require('blessed-contrib');
const program = require('commander');
const pkg = require('./package.json');
program
  .version(pkg.version)
  .name(pkg.name)
  .description(pkg.description)
  .option('-m, --max [i]', 'Sets the maximal temperature', parseInt)
  .option('-n, --min [i]', 'Sets the minimal temperature', parseInt)
  .option('-f, --fan [i]', 'Set the fan less noise level (0 to 255)', parseInt)
  .option('-t, --threshold [i]', 'Sets a threshold for more agressive mode', parseFloat)
  .option('-e, --efficiency [i]', 'Sets an efficiency coef (-1 to 1 : if fan is too noisy decrese)', parseFloat)
  .option('-h, --hwmon [s]', 'Sets the hwmon path')
  .option('-s, --silent', 'Enables the silent mode')
  .parse(process.argv);

const hwmon = program.hwmon ? program.hwmon : "/sys/class/hwmon";
const max = Math.round(program.max > 0 ? program.max : 87);
const min = Math.round(program.min > 0 ? program.min : max * 0.6);
const confort = program.fan > 0 ? program.fan : 120;
const threshold = program.threshold > 0 && program.threshold < 0.5 ? program.threshold : 0.2;
const loudness = program.efficiency ? program.efficiency : 0.2;

console.log("Looking for sensors");
fs.readdir(hwmon, function(err, files) {
  if (err) {
    console.error("Unable to scan hardware monitors folder");
    console.error("This tool supports only ubuntu with lm-sensors");
    return process.exit(1);
  }
  let temp = null;
  let fan = null;
  let name = null;
  files.forEach(function(file) {
    const stat = fs.statSync(hwmon + "/" + file);
    if (stat.isDirectory()) {
      if (!fan && fs.existsSync(hwmon + "/" + file + "/fan1_label")) {
        fan = hwmon + "/" + file + "/pwm1";
        temp = hwmon + "/" + file + "/temp1_input";
        name = fs.readFileSync(hwmon + "/" + file + "/name").toString().trim();
        name += ' -> ' + fs.readFileSync(hwmon + "/" + file + "/fan1_label").toString().trim();
        console.log("Found fan " + name);
        try {
          fs.writeFileSync(hwmon + "/" + file + "/pwm1_enable", "1");
        } catch(e) {
          console.error("Unable to load the manual fan mode");
          console.error("Try to run with sudo");
          return process.exit(2);
        }
      }
    }
  });
  if (!fan) {
    console.error("Unable to find any fan device");
    console.error("Try to run sensors-detect");
    return process.exit(3);
  }

  // init the screen
  const screen = program.silent ? null : blessed.screen();
  var grid = program.silent ? null : new contrib.grid({
    rows: 12,
    cols: 12,
    screen: screen
  })
  var datagrid = program.silent ? null : grid.set(0, 0, 12, 12, contrib.line, {
    showNthLabel: 5,
    maxY: 100,
    label: name + " (Min : " + min + "° - Low : " + Math.round(min + (min * threshold)) + "° - High : " + Math.round(min + (max * threshold)) + "° - Max : " + max + "°)",
    showLegend: true,
  });
  let cpuGraph = {
    title: 'CPU',
    style: {
      line: 'magenta'
    },
    x: Array(61).fill().map((_, i) => 60 - i),
    y: Array(61).fill(0)
  };
  let fanGraph = {
    title: 'FAN',
    style: {
      line: 'cyan'
    },
    x: Array(61).fill().map((_, i) => 60 - i),
    y: Array(61).fill(0)
  };
  if (!program.silent) {
    datagrid.setData([cpuGraph, fanGraph]);
    screen.render();
  }


  let lastCpu = 0;
  function checkTemp() {
    const tCpu = Math.round(
      Number.parseInt(fs.readFileSync(temp).toString(), 10) / 1000
    );
    const level = Number.parseInt(
      fs.readFileSync(fan).toString(), 10
    );
    let target = level;
    if (tCpu > max) {
      target = 255;
      if (program.silent) {
        console.warn(new Date() + "\tMax CPU temperature : " + tCpu + "°");
      }
    }
    if (tCpu < min + (min * threshold)) {
      if (tCpu < min && target > confort) {
        target = confort
      }
      if (lastCpu >= tCpu) {
        if (target > 10) {
          target -= 10;
        }
      }
    } else {
      if (tCpu < min + (max * threshold)) {
        if (target < confort) {
          target = confort;
        }
        if (lastCpu !== tCpu) {
          if (lastCpu > tCpu) {
            target -= 5;
          } else {
            target += 2;
          }
        }
      } else {
        if (target < confort * (1 + threshold)) {
          target = confort * (1 + loudness);
        }
        if (lastCpu > tCpu) {
          target -= 2 * (1 + loudness);
        } else {
          target += 2 * (2 + loudness);
        }
        if (program.silent && lastCpu < min + (max * threshold)) {
          console.log(new Date() + "\tHigh CPU temperature : " + tCpu + "° / " + target);
        }
      }
    }
    lastCpu = tCpu;
    target = Math.round(target);
    if (target > 255) target = 255;
    if (target < 0) target = 0;

    // flush fan change
    if (target != level) {
      fs.writeFileSync(fan, target.toString());
    }
    
    if (!program.silent) {
      cpuGraph.title = 'CPU ' + tCpu + '°';
      cpuGraph.y.shift();
      cpuGraph.y.push(
        tCpu < min ? 
          0 : Math.round((tCpu - min) / (max - min) * 100)
      );

      fanGraph.title = 'FAN ' + target;
      fanGraph.y.shift();
      fanGraph.y.push(
        target < confort ? 
          0 : Math.round((target - confort) / (255 - confort) * 100)
      );

      datagrid.setData([cpuGraph, fanGraph]);
      screen.render();
    }
    setTimeout(checkTemp, 5000); 
  }

  // request the exit
  !program.silent && screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    try {
      // reset level to confort by default
      if (lastCpu < max) {
        fs.writeFileSync(fan, confort);
      }
      // reset automatic mode on fan
      fs.writeFileSync(fan + "_enable", "2");
    } catch(e) {
      console.error("Unable to load the manual fan mode");
      console.error("Try to run with sudo");
      return process.exit(2);
    }
    return process.exit(0);
  });

  // every 5 sec
  checkTemp();
});
