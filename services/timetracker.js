const fetch = require('node-fetch-polyfill');

const request = async (fetchOp) => {
    try {
        const response = await fetchOp();

        if (response.status === 401) {
            return { isUnauthorized: true };
        }
        if (response.status === 200 || response.status === 201) {
            const json = await response.json();
            return json.data;
        }
        return { error: true, data: await response.text()};
    }
    catch (e) {
        return { error: true, data: e };
    }
};

const getHeaders = (authorization) => {
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/111.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
        "Authorization": authorization,
        "Content-Type": "application/json",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache"
    };
};

const TimeTracker = {

    getUserInfo: (authorization) => { //data: [{ fullName, role, idEmpleado, typeEmployee, idLegalEntity }]
        return request(() => {
            return fetch("https://employees.bairesdev.com/api/v1/employees/user-info", {
                "credentials": "include",
                "headers": getHeaders(authorization),
                "referrer": "https://employees.bairesdev.com/time-tracker",
                "method": "GET",
                "mode": "cors"
            });
        });
    },

    getProjects: (authorization, fromDate, toDate) => { //data: [{ id, name }]
        return request(() => {
            return fetch("https://employees.bairesdev.com/api/v1/employees/projects", {
                "credentials": "include",
                "headers": getHeaders(authorization),
                "referrer": "https://employees.bairesdev.com/time-tracker",
                "body": "{\"fromDate\":\"" + fromDate + "\",\"toDate\":\"" + toDate + "\",\"employeeId\":null}",
                "method": "PUT",
                "mode": "cors"
            });
        });
    },

    getFocalPoints: (authorization, projectId, fromDate, toDate) => { //data: [{ id, name }]
        return request(() => {
            return fetch("https://employees.bairesdev.com/api/v1/employees/focalpoints", {
                "credentials": "include",
                "headers": getHeaders(authorization),
                "referrer": "https://employees.bairesdev.com/time-tracker",
                "body": "{\"fromDate\":\"" + fromDate + "\",\"toDate\":\"" + toDate + "\",\"projectId\":" + projectId + ",\"employeeId\":null}",
                "method": "PUT",
                "mode": "cors"
            });
        });
    },

     // Absence, Development, Meetings (Client), etc.
     getTaskCategories: (authorization, fromDate, toDate) => { //data: [{ id, name }]
        return request(() => {
            return fetch("https://employees.bairesdev.com/api/v1/employees/taskcategories", {
                "credentials": "include",
                "headers": getHeaders(authorization),
                "referrer": "https://employees.bairesdev.com/time-tracker",
                "body": "{\"fromDate\":\"" + fromDate + "\",\"toDate\":\"" + toDate + "\",\"employeeId\":null}",
                "method": "PUT",
                "mode": "cors"
            });
        });
    },

    // Bug Fixing, Code review, Daily Meeting, etc
    getTaskDescriptions: (authorization, categoryId, fromDate, toDate) =>{ //data: [{ id, name, categoryId, categoryName, requireComments }]
        return request(() => {
            return fetch("https://employees.bairesdev.com/api/v1/employees/taskdescriptions", {
                "credentials": "include",
                "headers": getHeaders(authorization),
                "referrer": "https://employees.bairesdev.com/time-tracker",
                "body": "{\"categoryId\":" + categoryId +",\"fromDate\":\"" + fromDate + "\",\"toDate\":\"" + toDate + "\",\"employeeId\":null}",
                "method": "PUT",
                "mode": "cors"
            });
        });
    },

    getRecordTypes: (authorization, categoryId) => {
        return request(() => {
            return fetch("https://employees.bairesdev.com/api/v1/employees/recordtypes", {
                "credentials": "include",
                "headers": getHeaders(authorization),
                "referrer": "https://employees.bairesdev.com/time-tracker",
                "body": "{\"categoryId\":" + categoryId + ",\"employeeId\":null}",
                "method": "PUT",
                "mode": "cors"
            });
        });
    },

    getRecords: (authorization, fromDate, toDate) => { //data: [{ id, date, hours, descriptionId, descriptionName, comments }]
        return request(() => {
            return fetch("https://employees.bairesdev.com/api/v1/employees/records", {
                "credentials": "include",
                "headers": getHeaders(authorization),
                "referrer": "https://employees.bairesdev.com/time-tracker",
                "body": "{\"fromDate\":\"" + fromDate + "\",\"toDate\":\"" + toDate + "\",\"employee\":null}",
                "method": "PUT",
                "mode": "cors"
            });
        });
    },

    upsertRecord: (authorization, projectId, date, hours, focalPointId, descriptionId, comments) => {
        return request(() => {
            return fetch("https://employees.bairesdev.com/api/v1/employees/timetracker-record-upsert", {
                "credentials": "include",
                "headers": getHeaders(authorization),
                "referrer": "https://employees.bairesdev.com/time-tracker",
                "body": 
                    "{\"projectId\":" + projectId + 
                    ",\"date\":\"" + date + 
                    "\",\"hours\":" + hours + 
                    ",\"focalPointId\":" + focalPointId + 
                    ",\"descriptionId\":" + descriptionId + 
                    ",\"recordTypeId\":1," + 
                    "\"comments\":\"" + comments + 
                    "\",\"employeeId\":null}",
                "method": "PUT",
                "mode": "cors"
            });
        });
    }
};

exports.TimeTracker = TimeTracker;