var widget = document.getElementById("sensebox-widget");
var sensebox = widget.getAttribute("data-sensebox-id");
console.log(sensebox);

getWidgetHTML()
.then(content => {
    widget.innerHTML = content;
    insertStyleWithLoadListener("style.css");
    initSensorArea()
})
.catch(err => {
    console.log(err)
    document.querySelector(".widget").innerHTML = "Es ist ein Fehler aufgetreten: " + err
})

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
        link.onload = adjustHeight();
        document.querySelector("head").appendChild(link)
}

function initSensorArea() {
    return fetchBox()
    .then(sensorData => {
        appendTitle(sensorData.name);
        console.log(sensorData.name)
        var sensors = sensorData.sensors;
        createSensorDivs(sensors);
        setInterval(updateCurrentSensorValues, 1000)
    })
    .catch(err => {
        document.querySelector("#sensors").innerHTML = "Ein Fehler ist aufgetreten: " + err;
    })
}

function appendTitle(title) {
    var titleArea = document.querySelector("#titlearea");
    if (title.length > 15) {
        titleArea.style.fontSize = "18px";
    } else {
        titleArea.style.fontSize = "25px";
    };
    titleArea.innerHTML = title;
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
    if (data.lastMeasurement) {
        element.innerHTML = "<h3>" + data.title + ": </h3><p><i>" + formatDates(new Date(data.lastMeasurement.createdAt)) + "</i>: " + data.lastMeasurement.value + " " + data.unit + "</p>";
    } else {
        element.innerHTML = "<h3>" + data.title + ": </h3><p>Keine Daten verfügbar...</p>";
    }
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

//Der folgende Code wird nur initiiert, wenn der "History"-Button im Widget angeklickt wird.

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
        .catch(err => {
            document.getElementById("history-entries").innerHTML = "Es ist ein Fehler aufgetreten: " + err;
        })
}

function createAndInsertOptions(optionArray, select) {
    for (var i in optionArray) {
        var newOption = document.createElement("option");
        var currentOption = optionArray[i];
        newOption.value = currentOption._id;
        newOption.innerHTML = currentOption.title; 
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
        console.log(measurements);
        if (measurements.length !== 0) {
            console.log("NICHT LEER!")
            var i = 4;
            while (i >= 0 && measurements[i]) {
                addHistoryEntry(formatDates(new Date(measurements[i].createdAt)), measurements[i].value, currentSensor.unit);
                i--;
            };
        } else {
            console.log("LEER!")
            document.getElementById("history-entries").innerHTML = "<p>Leider gibt es hierfür keine aktuellen Messwerte.</p>"
        }
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

function addHistoryEntry(date, value, unit) {
    var newDiv = document.createElement('div');
    newDiv.className = "innerDiv-history";
    newDiv.innerHTML = "<p><i>" + date + "</i>: <b>" + value + unit + "</b></p>";
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
        if (currentSensor.lastMeasurement) {
            var parsedDate = formatDates(new Date(currentSensor.lastMeasurement.createdAt));
            var firstChild = document.getElementById("history-entries").firstChild;
            if (!firstChild || !firstChild.innerHTML.startsWith("<p><i>" + parsedDate)) {
                if (firstChild.innerHTML.startsWith("Leider")) firstChild.innerHTML = "";
                addHistoryEntry(parsedDate, currentSensor.lastMeasurement.value, currentSensor.unit)
            }
        }
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
        .catch(err => {
            document.querySelector("#graph-target").innerHTML = "Ein Fehler ist aufgetreten: " + err;
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
        if (data.length !== 0) {
            data = MG.convert.date(data, 'createdAt', d3.utcParse("%Y-%m-%dT%H:%M:%S.%LZ"));
            MG.data_graphic({
                data: data,
                full_width: true,
                full_height: true,
                right: 40,
                target: "#graph-target",
                area: false,
                backgroundColor: '#8C001A',
                title: currentSensor.title + " in " + currentSensor.unit,
                xax_count: 3,
                color: '#8C001A',
                x_accessor: 'createdAt',
                y_accessor: 'value',
                max_y: setMaxGraphHeight(data),
                mouseover: function(d, i) {
                    var formattedDate = formatDates(new Date(d.createdAt));
                    var measurement = formattedDate + " -> " + d.value + " " + currentSensor.unit;
                    d3.select('#graph-target svg .mg-active-datapoint')
                    .text(measurement);
                }
            });
        } else {
            graphArea.innerHTML = "<p>Leider gibt es hierfür keine aktuellen Messwerte.</p>"
        }
    })
}

function setMaxGraphHeight(data) {
    var maximum = 0;
    for (var i = 0; i < data.length; i++) {
        if (parseFloat(data[i].value) > maximum) {
            maximum = parseFloat(data[i].value)
        }
    }
    var res = Math.round(maximum * 1.2);
    return res;
}

function adjustHeight () {
    var widgetHeight = document.querySelector(".widget").getBoundingClientRect().height;
    console.log(widgetHeight);
    var widgetLists = document.querySelectorAll(".widget-list");
    console.log(widgetLists);
    widgetLists.forEach(element => {
        console.log(element);
        element.style.marginTop = 0.12 * widgetHeight + "px";
    })
}

function insertStyleWithLoadListener(url) {
    var style = document.createElement('style');
    style.textContent = '@import "' + url + '"';
    
    var fi = setInterval(function() {
      try {
        style.sheet.cssRules;
        adjustHeight();
        clearInterval(fi);
      } catch (e){}
    }, 10);  
    
    document.head.appendChild(style);
}