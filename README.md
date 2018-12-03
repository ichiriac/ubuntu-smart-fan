# ubuntu-smart-fan

> Automated Smart FAN for Ubuntu

I've made this app for an old laptop that got troubles with temperature and with the automatic mode the laptop still crashes after 20 or 30 minutes of use.

This kind of problems can be common because the CPU will overheat more rapidly over the time, and the fan becomes either too noisy, or less efficient.

In order to avoid these kind of problems this script reads the CPU temperature and depending of maximal temperature and the fan default speed, and others kind of parameters it will increase or decrease the fan rotation speed.

## How to install

```sh
sudo npm install -g ubuntu-smart-fan
```

This program works with `lm-sensors`, so if you don't have it yet, you may install it :

```sh
sudo apt-get install lm-sensors
sudo sensors-detect
```

> Note that it will work only with `lm-sensors` and will fail on Virtual Machines guests. You have to run the `ubuntu-smart-fan` command with sudo

![The console preview](https://github.com/ichiriac/ubuntu-smart-fan/blob/master/assets/preview.png "The console preview")

## Running issues

> Unable to scan hardware monitors folder. This tool supports only ubuntu with lm-sensors

This means you don't have a `/sys/class/hwmon` folder. Usually it's because you have not installed `lm-sensors`. You have to run `sudo apt-get install lm-sensors` in order to install it

> Unable to load the manual fan mode. Try to run with sudo

The manual mode in order to control the fan speed is a flag into a file, you need root access in order to be able to update that file. Re-run the command with the root account.

> Unable to find any fan device. Try to run sensors-detect

This script scans the sensors folder and looks for a fan device. Before being able to identify the fan you need to run `sudo sensors-detect` in order to detect any fan device. If you still have this message, run the soft with the debug flag `ubuntu-smart-fan --debug` and check if into the output you have any fan or pwm value. If it's the case, please open an issue on github and paste there the debug output

## How to configure

You can try it from the cli and test with default parameters in order to see how your CPU reacts. After working a bit with it, if the CPU becomes too hot :

If it's raising rapidly try to increase the `efficiency` parameter :
```sh
# sets the efficiency to 0.5  it will increase the fan more rapidly
sudo ubuntu-smart-fan --efficiency=0.5
```

If it stays too hot decrease the `max` or `min` parameter :
```sh
# sets the efficiency 
sudo ubuntu-smart-fan --efficiency=1 --max=70 --min=30
```

If your CPU is usually hot (lets says around 60° to 70°) and the fan does not lowers its temperature, you can also increase the thresold :
```sh
# sets the efficiency 
sudo ubuntu-smart-fan --threshold=0.3
```

If the fan is noisy even when the CPU is at a low temperature, you can decrease it's basic speed (some fans make more noise) - and check the temperature evolution
```sh
# sets the default fan speed (from 0 to 255)
sudo ubuntu-smart-fan --fan=60 --min=20
```

> Note : Anyway, this parameter is not too eficient because if the fan speed is not enough in order to cool the CPU it will automatically raise. You can also decrease the efficiency `efficiency` parameter but it may not protect enough our CPU. Every computer depending its behavior and capabilitie can vary in parameters, you need to find out your own parameters in order to stabilize the temperature and reduce the noise.

---

For example, my computer by using the auto mode had around 80° and raised to 90° and so ... The fan starts to make a bit of noise at around 120, and is noticeable at around 140.

Here my configuration : `sudo ubuntu-smart-fan --max=86 --min=45 --fan=100`

When the CPU goes higher than 62° the fan works at 140, but with the default configuration it will increase or decrease gradually. 

I personnaly don't want to hear the fan too high, but if you want to make it react when the CPU raises try `sudo ubuntu-smart-fan --max=90 --min=50 --fan=100 --efficiency=2`

The high temperature becomes at 68° and low at 60°. When the temperature goes high, the fan will go rapidly to max, and then it will decrease gradually if the temperature goes down. It will become silent bellow low temperature.

Happy testing :smile:

## Help

```
Usage: ubuntu-smart-fan [options]

Automated Smart FAN for Ubuntu

Options:
  -V, --version         output the version number
  -m, --max [i]         Sets the maximal temperature
  -n, --min [i]         Sets the minimal temperature
  -f, --fan [i]         Set the fan less noise level (0 to 255)
  -t, --threshold [i]   Sets a threshold for more agressive mode
  -e, --efficiency [i]  Sets an efficiency coef (-1 to 1 : if fan is too noisy decrese)
  -h, --hwmon [s]       Sets the hwmon path
  -s, --silent          Enables the silent mode
  -h, --help            output usage information
```

## How to daemon

Once configured, you have the right parameters, so you can run it on a daemon :

```sh
npm install -g forever
npm install -g forever-service
sudo forever-service install ubuntu-smart-fan -s /usr/local/bin/ubuntu-smart-fan -o " --silent" --start
```

In order to control the service :

```
Commands to interact with service ubuntu-smart-fan
Start   - "sudo service ubuntu-smart-fan start"
Stop    - "sudo service ubuntu-smart-fan stop"
Status  - "sudo service ubuntu-smart-fan status"
Restart - "sudo service ubuntu-smart-fan restart"
```

In order to check if the temperature does not raises too high, you can have a look at logs here `/var/log/ubuntu-smart-fan.log`

You can also edit paramters about `ubuntu-smart-fan` by editing the `line 86`, locate the following command : `	start /usr/local/bin/ubuntu-smart-fan  --silent 2>&1 >/dev/null`

## Licence

Relased under MIT - no waranty, be careful to how your CPU behave
