# MMM-ShellyStatusTable

The MMM-ShellyStatusTable module displays the switch status and power consumption of multiple Shelly devices in a table on the MagicMirror², including a total consumption sum. It regularly updates the data via the Shelly Cloud API Gen 1 and Gen 2+.

It is currently hard to say if every device is considered correctly. I have the following devices and it works:
 - Shelly Plug / PlugS
 - Shelly Plus Plug S
 - Shelly Plus 1 PM 

Example:
![Example of MMM-ShellyStatusTable](./IMG_4118.jpg)
(my Mirror is running headless only, so only a stupid picture)


## Installation

### Install

In your terminal, go to your [MagicMirror²][mm] Module folder and clone MMM-ShellyStatusTable:

```bash
cd ~/MagicMirror/modules
git clone [GitHub url]
```

### Update

```bash
cd ~/MagicMirror/modules/MMM-Template
git pull
```

## Using the module

To use this module, add it to the modules array in the `config/config.js` file:

```js
    {
        module: 'MMM-Template',
        position: 'lower_third'
    },
```

Or you could use all the options:

```js
    {
        module: 'MMM-Template',
        position: 'lower_third',
        config: {
            exampleContent: 'Welcome world'
        }
    },
```

## Configuration options

Option|Possible values|Default|Description
------|------|------|-----------
`exampleContent`|`string`|not available|The content to show on the page

## Sending notifications to the module

Notification|Description
------|-----------
`TEMPLATE_RANDOM_TEXT`|Payload must contain the text that needs to be shown on this module

## Developer commands

- `npm install` - Install devDependencies like ESLint.
- `npm run lint` - Run linting and formatter checks.
- `npm run lint:fix` - Fix linting and formatter issues.

[mm]: https://github.com/MagicMirrorOrg/MagicMirror
