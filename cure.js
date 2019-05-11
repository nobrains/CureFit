"use strict";
const https = require('https'),
    co = require('co'),
    config = require('./config'),
    /*
    Maintaining a list of activities and my preference
    The id field is the workoutId which part of classes object as a response of `api/cult/classes/` API
    */

    ActivityType = {
        "boxing": {
            "id": 8,
            "name": "Boxing",
            "displayText": "Boxing",
            "preference": 3
        },
        "hrx": {
            "id": 37,
            "name": "HRX",
            "displayText": "HRX",
            "preference": 1
        },
        "hathaYoga": {
            "id": 40,
            "name": "Hatha Yoga",
            "displayText": "Hatha Yoga",
            "preference": 4
        },
        "kettleBell": {
            "id": 14,
            "name": "Kettlebell",
            "displayText": "Kettlebell",
            "preference": 8
        },
        "others": {
            "id": 1,
            "name": "Others",
            "displayText": "Others",
            "preference": 9
        },
        "powerYoga": {
            "id": 48,
            "name": "Power Yoga",
            "displayText": "Power Yoga",
            "preference": 5
        },
        "prowl": {
            "id": 46,
            "name": "Prowl",
            "displayText": "Prowl",
            "preference": 6
        },
        "running": {
            "id": 38,
            "name": "Running",
            "displayText": "Running",
            "preference": 7
        },
        "snc": {
            "id": 9,
            "name": "S & C",
            "displayText": "S & C",
            "preference": 2
        },
        "zumba": {
            "id": 7,
            "name": "Zumba",
            "displayText": "Zumba",
            "preference": 10
        }
    };

/*
* st, at and osname are compulsory headers cure.fit expects.
* You will see it being sent in each and every API request
* */
const commonHeaders = {
    "accept": "application/json",
    "st": config.st,
    "at": config.at,
    "osname": config.osName
};
const CURE_FIT_HOST = "www.cure.fit";
const URI = {
    "GET_CLASSES": "/api/cult/classes/v2?productType=FITNESS",
    "BOOK_CLASS": "/api/cult/class/${activityID}/book"
};
const HTTP_POST = "POST",
    HTTP_GET = "GET";

/*
Cure.fit requires slot in the following format
 */
const PREFERRED_SLOT = '07:00:00';
/*
* You will have to figure the id of your preferred center
* You will get it from centerInfoMap object as a part of response of `api/cult/classes/` API
* */
const PREFERRED_CENTER = 45;


//My preferred activities
const PREFERRED_CLASSES_IN_ORDER = [ActivityType.hrx, ActivityType.snc, ActivityType.boxing];

co(function* () {
    //fetch classes
    let classes = yield makeAPICall({}, CURE_FIT_HOST, URI.GET_CLASSES, HTTP_GET, commonHeaders);
    //get the lastest date available to book.
    let date = classes.days[classes.days.length - 1].id;
    //fetch if slots are available for preferred slot and class.
    let slots = getSlots(classes.classByDateMap[date], PREFERRED_SLOT, PREFERRED_CLASSES_IN_ORDER);
    if (slots.length > 0) {
        //book!
        yield bookClass(slots[0].id);
        console.log("Yay! booked");
    } else {
        errorHandler("No classes")
    }
}).then(function () {
}, function (error) {
    errorHandler(error);
});


function* bookClass(activityID) {
    return yield makeAPICall({}, CURE_FIT_HOST, "/api/cult/class/" + activityID + "/book", HTTP_POST, commonHeaders)

}

function* makeAPICall(request, host, path, method, headers) {
    headers['Content-Type'] = 'application/json';
    headers['User-Agent'] = 'CommonMan';
    let httpParams = {
        host: host,
        path: path,
        method: method,
        headers: headers
    };
    return new Promise(function (resolve, reject) {
        try {
            let post_req = https.request(httpParams, function (res) {
                res.setEncoding('utf8');
                let responseStatus = parseInt(res.statusCode);
                let response = '';

                res.on('data', function (chunk) {
                    response += chunk;
                });
                res.on('end', function () {
                    let output = (response.length === 0) ? '' : (isResponseJSON(res) ? JSON.parse(response) : response);
                    if (responseStatus !== 200) {
                        reject(response);
                    }
                    return resolve(output);
                });
                res.on('error', function (e) {
                    return reject(e);
                });
            });
            post_req.on('error', function (e) {
                return reject(e);
            });
            post_req.write(JSON.stringify(request));
            post_req.end();
        } catch (error) {
            return reject(error);
        }
    });
}

function isResponseJSON(response) {
    return response.headers['content-type'] === 'application/json; charset=utf-8';
}

function getSlots(classesForDay, slot, classTypes) {
    let classTypeIDs = classTypes.map(function (classType) {
        return classType.id;
    });
    let classIDs = classesForDay.classByTimeList.filter(function (classByTime) {
        return classByTime.id == slot;
    })[0].centerWiseClasses.filter(function (center) {
        return center.centerId == PREFERRED_CENTER;
    })[0]
        .classes.filter(function (classs) {

            let filterElement = classTypes.filter(function (classType) {
                return classType.id == classs.workoutId
            })[0];
            if (!filterElement) {
                return false;
            }
            classs.preference = filterElement.preference;
            return (classTypeIDs.indexOf(classs.workoutId) > -1) && classs.state === 'AVAILABLE'
        })
        .sort(function (class1, class2) {
            return class1.preference - class2.preference;
        });
    return classIDs;
}

function errorHandler(error) {
    console.log("Failed! ",error);
}
