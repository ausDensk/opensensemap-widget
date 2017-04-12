var widget = document.getElementById("sensebox-widget");
var sensebox = widget.getAttribute("data-sensebox-id");

getWidgetHTML()
.then(content => {
    widget.innerHTML = content;
    insertWidgetStyle("style.css");
    console.log(sensebox);
    initSensorArea()
})
.catch(err => console.log(err))

function getWidgetHTML() {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "text/html");
    return fetch(new Request("widget.html", {
        method: "GET",
        headers: myHeaders
    })).then(res => res.text())
}

function insertWidgetStyle(url) {
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = url;
        document.querySelector("head").appendChild(link)
}

function initSensorArea() {
    return fetchBox()
    .then(sensorData => {
        console.log(sensorData.name)
        var sensors = sensorData.sensors;
        createSensorDivs(sensors);
        setInterval(updateCurrentSensorValues, 1000)
    })
}

function fetchBox () {
    return fetchJSON("https://api.opensensemap.org/boxes/" + sensebox)
}

function fetchJSON(url) {
    return fetch(url).then(res => res.json())
}

function createSensorDivs(sensors) {
    for (var i in sensors) {
        var newDiv = document.createElement("div");
        newDiv.className = "innerDiv";
        newDiv.id = "widget-sensor-" + sensors[i]._id;
        fillDiv(newDiv, sensors[i]);
        var sensorTab = document.querySelector("#sensors");
        sensorTab.appendChild(newDiv)
    }
}

function fillDiv(element, data) {
    element.innerHTML = "<h3>" + data.title + ": </h3><p>" + formatDates(new Date(data.lastMeasurement.createdAt)) + ": " + data.lastMeasurement.value + " " + data.unit;
}

function updateCurrentSensorValues() {
    fetchBox()
    .then(sensorData => {
        var sensors = sensorData.sensors;
        for (var i in sensors) {
            var requiredID = "widget-sensor-" + sensors[i]._id;
            fillDiv(document.getElementById(requiredID), sensors[i])
        }
    })
}

//Der folgende Code wird nur initiiert, wenn der "Graph"-Button im Widget angeklickt wird.

function initHistoryArea() {
        fetchBox()
        .then(sensorData => {
            var select = document.getElementById("currentsensorhistory");
            if (select.innerHTML === "") {
                var sensors = sensorData.sensors;
                createAndInsertOptions(sensors, select)
            }
            if (document.getElementById("history-entries").innerHTML === "") { //Für den Fall, dass man zum Tab zurückkehrt, nachdem man ihn schon einmal aufgerufen hat
                insertOldEntries(sensorData).then(() => setInterval(checkForNewMeasurements, 3000));
            } else {
                setInterval(checkForNewMeasurements, 3000);
            }
        })
}

function createAndInsertOptions(optionArray, select) {
    for (var i in optionArray) {
        var newOption = document.createElement("option");
        var currentOption = optionArray[i];
        newOption.value = currentOption._id;
        newOption.innerHTML = currentOption.title; 
        console.log(select)   
        select.appendChild(newOption)
    }
}

function insertOldEntries(sensorObject) {
    document.getElementById("history-entries").innerHTML = "";
    var sensorID = getSelectedValue("currentsensorhistory");
    var currentSensor = searchSensorinArray(sensorID, sensorObject.sensors);
    console.log("sensorID: " + sensorID);
    return fetchJSON("https://api.opensensemap.org/boxes/" + sensebox + "/data/" + sensorID)
    .then(measurements => {
        for (var i = 4; i >= 0; i--) { //Weil neuester Eintrag bei 0
            addEntry(formatDates(new Date(measurements[i].createdAt)), measurements[i].value, currentSensor.unit)
        };
    })
}

function getSelectedValue(elementID) {
    var select = document.getElementById(elementID);
    return select.options[select.selectedIndex].value;
}

function searchSensorinArray (id, arr) {
    console.log(id);
    console.log(arr);
    for (var i in arr) {
        if (arr[i]._id === id) {
            return arr[i];
        }
    }
    return undefined;
};

function addEntry(date, value, unit) {
    var newDiv = document.createElement('div');
    newDiv.className = "innerDiv-history";
    newDiv.innerHTML = "<p><i>" + date + "</i>: " + value + unit + "</p>";
    var historyEntries = document.getElementById("history-entries");
    historyEntries.insertBefore(newDiv, historyEntries.firstChild);
}

function formatDates(date) {
    var monthNames = [
    "Januar", "Februar", "März",
    "April", "Mai", "Juni", "Juli",
    "August", "September", "Oktober",
    "November", "Dezember"
    ];
    var day = date.getDate();
    var monthIndex = date.getMonth();
    var year = date.getFullYear();

    return day + '. ' + monthNames[monthIndex] + ', ' + fillWithZero(date.getHours()) + ":" + fillWithZero(date.getMinutes()) + ":" + fillWithZero(date.getSeconds());
}

function fillWithZero(number) {
    return String(number).length === 1 ? '0' + number : number
}

function checkForNewMeasurements() {
    fetchBox()
        .then(sensorData => {
            var sensorID = getSelectedValue("currentsensorhistory");
            console.log(sensorData)
            var currentSensor = searchSensorinArray(sensorID, sensorData.sensors);
            var parsedDate = formatDates(new Date(currentSensor.lastMeasurement.createdAt));
            if (!document.getElementById("history-entries").firstChild.innerHTML.startsWith("<p><i>" + parsedDate)) addEntry(parsedDate, currentSensor.lastMeasurement.value, currentSensor.unit)
        })
}

//Diese Funktionen werden aufgerufen, wenn der Graphen-Tab angeklickt wird.

function initGraphArea() {
    fetchBox()
        .then(sensorData => {
            var select = document.getElementById("currentsensorgraph");
            if (select.innerHTML === "") {
                var sensors = sensorData.sensors;
                createAndInsertOptions(sensors, select)
            }
            if (document.getElementById("graph-target").innerHTML === "") {
                drawGraph(sensorData);
            }
        })
}

function drawGraph(sensorObject) {
    insertWidgetStyle("https://cdnjs.cloudflare.com/ajax/libs/metrics-graphics/2.11.0/metricsgraphics.css");
    var graphArea = document.getElementById("graph-target");
    graphArea.innerHTML = "";
    var selectedSensor = document.getElementById("currentsensorgraph");
    var sensorID = selectedSensor.options[selectedSensor.selectedIndex].value;
    var currentSensor = searchSensorinArray(sensorID, sensorObject.sensors);
    console.log(currentSensor)
    console.log(sensorObject);
    var url = "https://api.opensensemap.org/boxes/" + sensebox + "/data/" + sensorID;
    d3.json(url, function(data) {
        console.log(data);
        data = MG.convert.date(data, 'createdAt', d3.utcParse("%Y-%m-%dT%H:%M:%S.%LZ"));
        MG.data_graphic({
            data: data,
            full_width: true,
            full_height: true,
            right: 40,
            target: graphArea,
            area: false,
            backgroundColor: '#8C001A',
            title: currentSensor.title + " in " + currentSensor.unit,
            xax_count: 3,
            color: '#8C001A',
            x_accessor: 'createdAt',
            y_accessor: 'value',
            inflator: 5,
            mouseover: function(d, i) {
                var formattedDate = formatDates(new Date(d.createdAt));
                var measurement = formattedDate + " -> " + d.value + " " + currentSensor.unit;
                d3.select('#graph-target svg .mg-active-datapoint')
                .text(measurement);
            }
        });
    })
}