# ubuntu-smart-fan

> Automated Smart FAN for Ubuntu

I've made this app for an old laptop that got troubles with temperature and with the automatic mode the laptop still crashes after 20 or 30 minutes of use.

This kind of problems can be common because the CPU will overheat more rapidly over the time, and the fan becomes either too noisy, or less efficient.

In order to avoid these kind of problems this script reads the CPU temperature and depending of maximal temperature and the fan default speed, and others kind of parameters it will increase or decrease the fan rotation speed.

## How to install

```sh
npm install -g ubuntu-smart-fan
```

## How to configure

You can try it from the cli and test with default parameters in order to see how your CPU reacts. After working a bit with it, if the CPU becomes too hot :

If it's raising rapidly try to increase the `efficiency` parameter :
```sh
# sets the efficiency to 0.5  it will increase the fan more rapidly
sudo ubuntu-smart-fan --efficiency=0.5
```

If it stays too hot decrease the `max` parameter :
```sh
# sets the efficiency 
sudo ubuntu-smart-fan --efficiency=1 --max=80
```

If your CPU is usually hot (lets says around 60° to 70°) and the fan does not lowers its temperature, you can also increase the thresold :
```sh
# sets the efficiency 
sudo ubuntu-smart-fan --threshold=0.3
```

If the fan is noisy even when the CPU is at a low temperature, you can decrease it's basic speed (some fans make more noise) - ut check the temperature evolution
```sh
# sets the default fan speed (from 0 to 255)
sudo ubuntu-smart-fan --fan=60
```

Note : Anyway, this parameter is not too eficient because if the fan speed is not enough in order to cool the CPU it will automatically raise. You can also decrease the efficiency `efficiency` parameter but it may not protect enough our CPU.

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

## Licence

Relased under MIT - no waranty, be careful to how your CPU behave