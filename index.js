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
  .option('-d, --debug', 'Outputs debug informations')
  .option('-r, --dry', 'Read/Only dry mode')
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
  const fans = [];

  let temp = null;
  let fan = null;
  let name = null;
  let label = null;

  files.forEach(function(file) {
    const stat = fs.statSync(hwmon + "/" + file);
    if (stat.isDirectory()) {
      if (program.debug) {
        var contents = fs.readdirSync(hwmon + "/" + file);
        console.log('\n## ' + file + ' :');
        contents.forEach(function(item) {
          const path = hwmon + "/" + file + "/" + item;
          const stat = fs.statSync(path);
          if (!stat.isDirectory()) {
            const value = fs.readFileSync(path).toString().trim();
            console.log('  - ' + item + ' = ' + value);
          }
        });
      }
      // resolve the controller name
      try {
        name = fs.readFileSync(hwmon + "/" + file + "/name").toString().trim();
      } catch(e) {
        name = file;
      }
      // scan for 5 first fans
      for(var f = 1; f < 6; f++) {
        fan = hwmon + "/" + file + "/pwm" + f;
        if (fs.existsSync(fan)) {
          temp = hwmon + "/" + file + "/temp"+f+"_input";
          try {
            label = fs.readFileSync(hwmon + "/" + file + "/fan1_label").toString().trim();
          } catch(e) {
            label = 'fan' + f;
          }
          if (fs.existsSync(temp)) {
            fans.push({
              input: temp,
              name: name,
              label: label,
              controller: fan,
              value: 0
            });
            if (!program.debug) {
              console.log("Found fan " + name + " -> " + label);
              try {
                if (!program.dry) {
                  fs.writeFileSync(hwmon + "/" + file + "/pwm1_enable", "1");
                }
              } catch(e) {
                console.error("Unable to load the manual fan mode");
                console.error("Try to run with sudo");
                return process.exit(2);
              }
            }
          }
        }
      }
      
    }
  });
  if (fans.length === 0) {
    console.error("Unable to find any fan device");
    console.error("Try to run sensors-detect");
    return process.exit(3);
  }

  if (program.debug) {
    console.log('\n---\n');
    fans.forEach(function(item) {
      console.log('Device : ' + item.name);
      console.log('Fan : ' + item.label);
      console.log('Controller : ' + item.controller);
      console.log('Temperature : ' + item.input);
    }); 
    return process.exit(0);
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
    label: "Min : " + min + "° - Low : " + Math.round(min + (min * threshold)) + "° - High : " + Math.round(min + (max * threshold)) + "° - Max : " + max + "°",
    showLegend: true,
  });

  let colors = [
    'magenta',
    'cyan',
    'green',
    'yellow',
    'blue2',
    'red',
    'magenta3',
    'cyan3',
    'green3',
    'yellow3'
  ];


  let lines = [];
  fans.forEach(function(item, index) {
    lines.push({
      title: item.label + ' °',
      style: {
        line: colors[(index % 5) * 2]
      },
      x: Array(61).fill().map((_, i) => 60 - i),
      y: Array(61).fill(0)
    });
    lines.push({
      title: item.label,
      style: {
        line: colors[((index % 5) * 2) + 1]
      },
      x: Array(61).fill().map((_, i) => 60 - i),
      y: Array(61).fill(0)
    });
  });

  if (!program.silent) {
    datagrid.setData(lines);
    screen.render();
  }


  function checkTemp() {
    // run for each fan
    fans.forEach(function(item, index) {
      const tCpu = Math.round(
        Number.parseInt(fs.readFileSync(item.input).toString(), 10) / 1000
      );
      const level = Number.parseInt(
        fs.readFileSync(item.controller).toString(), 10
      );
      let target = level;
      if (tCpu > max) {
        target = 255;
        if (program.silent) {
          console.warn(new Date() + "\tMax "+item.label+" temperature : " + tCpu + "°");
        }
      }
      let lastCpu = item.value;
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
            console.log(new Date() + "\tHigh "+item.label+" temperature : " + tCpu + "° / " + target);
          }
        }
      }
      item.value = tCpu;
      target = Math.round(target);
      if (target > 255) target = 255;
      if (target < 0) target = 0;

      // flush fan change
      if (target != level && !program.dry) {
        fs.writeFileSync(item.controller, target.toString());
      } else {
        target = level;
      }
      if (!program.silent) {
        lines[index * 2].title = item.label + ' : ' + tCpu + '°';
        lines[index * 2].y.shift();
        lines[index * 2].y.push(
          tCpu < min ? 
            0 : Math.round((tCpu - min) / (max - min) * 100)
        );
        lines[(index * 2) + 1].title = item.label + ' : ' + Math.round((target / 255) * 100) + '%';
        lines[(index * 2) + 1].y.shift();
        lines[(index * 2) + 1].y.push(
          target < confort ? 
            0 : Math.round((target - confort) / (255 - confort) * 100)
        );
      }
    });

    if (!program.silent) {
      datagrid.setData(lines);
      screen.render();
    }
    setTimeout(checkTemp, 5000); 
  }

  // request the exit
  !program.silent && screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    try {
      if (!program.dry) {
        fans.forEach(function(item, index) {
          // reset level to confort by default
          if (item.value < max) {
            fs.writeFileSync(item.controller, confort);
          }
          // reset automatic mode on fan
          fs.writeFileSync(item.controller + "_enable", "2");
        });
      }
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
