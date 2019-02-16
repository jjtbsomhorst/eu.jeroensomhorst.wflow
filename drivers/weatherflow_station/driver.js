'use strict';

const Homey = require('homey');
const format = require('string-format');
const https = require("https");
const API_URL = "https://swd.weatherflow.com/swd/rest/observations/station/{0}?api_key={1}";

const CRONTASK_RETRIEVESTATIONINFO = "eu.jeroensomhorst.weatherflowsstation.cron";

class WeatherflowStation extends Homey.Driver {

    onInit() {
        Homey.app.log('Initialize Weatherflow station driver');
        this.capabilitymap = new Map();
        this.capabilitymap.set('measure_temperature','air_temperature');
        this.capabilitymap.set('measure_humidity','relative_humidity');
        this.capabilitymap.set('measure_pressure','barometric_pressure');
        this.capabilitymap.set('measure_wind_strength','wind_avg');
        this.capabilitymap.set('measure_wind_angle','wind_direction');
        this.capabilitymap.set('measure_gust_strength','wind_gust');
        this.capabilitymap.set('measure_uvindex_capability','uv');
        this.capabilitymap.set('measure_apparent_temperature_capability','feels_like');

        Homey.ManagerCron.getTask(CRONTASK_RETRIEVESTATIONINFO)
            .then(task => {
                this.log("The task exists: " + CRONTASK_RETRIEVESTATIONINFO);
                task.on('run', () => this.onCronRun());
            })
            .catch(err => {
                if (err.code === 404) {
                    this.log("The task has not been registered yet, registering task: " + CRONTASK_RETRIEVESTATIONINFO);
                    Homey.ManagerCron.registerTask(CRONTASK_RETRIEVESTATIONINFO, "1 */1 * * * *", {})
                        .then(task => {
                            task.on('run', () => this.onCronRun());
                        })
                        .catch(err => {
                            this.log(`problem with registering cronjob: ${err.message}`);
                        });
                } else {
                    this.log(`other cron error: ${err.message}`);
                }
            });
    }

    async onCronRun(){
        console.log("cron run");
        let devices = this.getDevices();

        if(devices.length > 0){
            console.log("we have devices");
            for(let i = 0; i < devices.length;i++){
                let device = devices[i];
                let settings = device.getSettings();
                console.log(settings)
                try {
                    let result = await this.getStationInfo(settings.apikey, settings.stationid);
                    if (result !== false) {
                        let info = JSON.parse(result.body);
                        Homey.app.log(info);
                        if(info.status.status_message === 'SUCCESS' && info.hasOwnProperty('obs')){

                            let obs = info.obs[0]; // only get the first device..?

                            for (let [key, value] of this.capabilitymap) {
                                if(obs.hasOwnProperty(value)){
                                    device.setCapabilityValue(key,obs[value]);
                                }

                            }
                        }else{
                            Homey.app.error('Could not get readings from station');
                            Homey.app.error('Station: '+settings.stationid);
                        }
                    }
                }catch(e){
                    Homey.app.error('Unable to retrieve data from api for device');
                    Homey.app.error(e);
                    Homey.app.log('Station: '+settings.stationid);
                    Homey.app.log('Api key: '+settings.apikey);

                }
            }
        }
    }

    onPair(socket){

        // validate settings from the device
        socket.on('validate',(data,callback)=>{
            this.getStationInfo(data.apikey,data.stationid).then((response)=>{
                console.log('response from api call');
                console.log(response);
                callback(null,'ok');
            }).catch((err)=>{
                callback(new Error('unable to retrieve data'),null);
            });
        });

    }

    async getStationInfo(key,stationid){
        this.log("Get station info");
        this.log("Api key: "+ key);
        this.log("Station: "+stationid);


        let url = format(API_URL,stationid,key);
        this.log(url);

        return new Promise((resolve,reject)=>{
            https.get(url,(res)=>{
                if(res.statusCode === 200) {
                    let body = [];
                    res.on('data', (chunk) => {
                        this.log("retrieve data");
                        body.push(chunk);
                    });
                    res.on('end', () => {
                        this.log("Done retrieval of data");
                        resolve({
                            "body": Buffer.concat(body)
                        });
                    });
                }else{
                    reject(null);
                }
            }).on('error',(err)=>{
                this.log("Error while connecting to domoticz");
                this.log(err);
                reject(err);
            });


        });
    }

}


module.exports = WeatherflowStation;