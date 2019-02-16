'use strict';

const Homey = require('homey');

class WeatherflowStationDevice extends Homey.Device{

    onInit(){
        Homey.app.log('Initialize device');
    }

    hasValidSettings(){
        let settings = this.getSettings();
        return (settings.hasOwnProperty('apikey') && settings.hasOwnProperty('stationid'));
    }

    onSettings(oldsettings, newSettings,changedKeys){
        Homey.app.log('settings changed');
        super.onSettings(oldsettings,newSettings,changedKeys);
    }

    onAdded(){
        Homey.app.log('device added')
    }

    onDeleted(){
        Homey.app.log('device deleted');
    }


}

module.exports = WeatherflowStationDevice;
