var widget = document.getElementById("sensebox-widget");
var sensebox = widget.getAttribute("data-sensebox-id");
var generalBoxDetails;
console.log(sensebox);

insertStylesheetWithOnloadListener("https://cdnjs.cloudflare.com/ajax/libs/metrics-graphics/2.11.0/metricsgraphics.css")
.then(() => {
    return loadJSAsync("https://unpkg.com/d3")
})
.then(() => {
    return loadJSAsync("https://unpkg.com/metrics-graphics")
})
.then(getWidgetHTML)
.then(content => {
    widget.innerHTML = content;
    return fetchBox()
}).then(box => {
    generalBoxDetails = box;
    console.log(box);
    return insertStylesheetWithOnloadListener("https://ausdensk.github.io/opensensemap-widget/style.css", box)
}).then(box => {
    console.log(box);
    applyStylesToWidgetWithJS(box)
    initSensorArea(box)
})
.catch(err => {
    console.log(err)
    document.querySelector(".widget").innerHTML = "Es ist ein Fehler aufgetreten: " + err
})

function checkTargetAndLoadOneOfTheScreens(box) {
    var currentURL = window.location.href;
    if (hasURLEnding(currentURL, ["#graph", "#graph/"])) {
        initGraphArea()
    } else if (hasURLEnding(currentURL, ["#history", "#history/"])) {
        initHistoryArea()
    } else {
        initSensorArea(box)
    }
}

function hasURLEnding(url, arr) {
    for (var i in arr) {
        if (url.endsWith(arr[i])) return true
    }
    return false;
}

function getWidgetHTML() {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "text/html");
    return fetch(new Request("https://ausdensk.github.io/opensensemap-widget/widget.html", {
        method: "GET",
        headers: myHeaders
    })).then(res => res.text())
}

function initSensorArea(sensorData) {
    var sensors = sensorData.sensors;
    if (document.querySelector("#sensors").innerHTML === "") createSensorDivs(sensors);
    setInterval(updateCurrentSensorValues, 30000)
}

function appendTitle(title) {
    var titleArea = document.querySelector("#titlearea");
    var titleTooltip = document.querySelector(".titletooltip");
    titleTooltip.innerHTML = title;
    titleArea.style.fontSize = setTitleFontSize(title);
    if (title.length > 30) title = shortenTitle(title);
    titleArea.innerHTML = title;
}

function setTitleFontSize(title) {
    var widgetHeight = document.querySelector(".widget-wrapper").offsetHeight;
    console.log(typeof(widgetHeight) + " " + widgetHeight);
    if (widgetHeight >= 300) {
        if (title.length > 15) {
            return "16px";
        } else {
            return "25px";
        }
    } else {
        console.log("Height < 300px " + title.length);
        if (title.length > 15) {
            return "12px";
        } else {
            return "15px";
        }
    } 
}

function shortenTitle(title) {
    return title.substring(0, 27) + "..."
}

function appendDescription(description) {
    var tooltip = document.querySelector(".tooltip");
    tooltip.innerHTML = description ? "<p>" + description + "</p>" : "<p>Keine Beschreibung verfügbar.</p>"
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
                insertOldEntries(sensorData).then(() => setInterval(checkForNewMeasurements, 30000));
            } else {
                setInterval(checkForNewMeasurements, 30000);
            }
        })
        .catch(err => {
            console.log(err);
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
            while (i >= 0) {
                if (measurements[i]) addHistoryEntry(formatDates(new Date(measurements[i].createdAt)), measurements[i].value, currentSensor.unit);
                i--;
            };
        } else {
            console.log("LEER!")
            document.getElementById("history-entries").innerHTML = "<p>Leider gibt es hierfür keine aktuellen Messwerte.</p>"
        }
    })
    .catch(err => {
        console.log(err);
        document.getElementById("history-entries").innerHTML = "<p>Ein Fehler ist aufgetreten: " + err + "</p>"
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
            if (!firstChild || firstChild === null || !firstChild.innerHTML.startsWith("<p><i>" + parsedDate)) {
                if (firstChild && firstChild !== null && firstChild.innerHTML.startsWith("Leider")) firstChild.innerHTML = "";
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
    var graphArea = document.getElementById("graph-target");
    graphArea.innerHTML = "";
    var selectedSensor = document.getElementById("currentsensorgraph");
    var sensorID = selectedSensor.options[selectedSensor.selectedIndex].value;
    var currentSensor = searchSensorinArray(sensorID, sensorObject.sensors);
    console.log(currentSensor)
    console.log(sensorObject);
    var url = "https://api.opensensemap.org/boxes/" + sensebox + "/data/" + sensorID;
    d3.json(url, function(err, data) {
        if (err || !data || data === null) {
            console.log(err);
            document.querySelector("#graph-target").innerHTML = "Ein Fehler ist aufgetreten: " + err
        };
        console.log(data);
        data = reduceAmountOfDrawnData(data);
        console.log("Getrimmt:")
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
                max_y: setMaxGraphValue(data),
                min_y: setMinGraphValue(data),
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

function setMaxGraphValue(data) {
    var maximum = 0;
    for (var i = 0; i < data.length; i++) {
        if (parseFloat(data[i].value) > maximum) {
            maximum = parseFloat(data[i].value)
        }
    }
    return maximum > 0 ? maximum * 1.2 : maximum - maximum * 0.2;
}

function setMinGraphValue(data) {
    var minimum = data[0].value;
    for (var i = 1; i < data.length; i++) {
        if (parseFloat(data[i].value) < minimum) {
            minimum = parseFloat(data[i].value)
        }
    }
    return minimum < 0 ? minimum * 1.2 : minimum - minimum * 0.2;
}

function adjustHeight () {
    console.log("Height wird adjustet!");
    var widget = document.querySelector(".widget");
    var widgetHeight = widget.getBoundingClientRect().height;
    var widgetLists = ["#graph", "#sensors", "#history"];
    for (var i in widgetLists) {
        var currentWidgetList = document.querySelector(widgetLists[i]);
        console.log(currentWidgetList);
        currentWidgetList.style.marginTop = 0.12 * widgetHeight + "px";
    }
}

function adjustMarginTopWithParentHeight (parent, child, margin) {
    var elementHeight = parent.offsetHeight;
    if (margin.top) child.style.marginTop = margin.top * elementHeight + "px";
    if (margin.bottom) child.style.marginBottom = margin.bottom * elementHeight + "px";
}

function adjustPaddingTopWithParentHeight (parent, child, padding) {
    var elementHeight = parent.offsetHeight;
    if (padding.top) child.style.paddingTop = padding.top * elementHeight + "px";
    if (padding.bottom) child.style.paddingBottom = padding.bottom * elementHeight + "px";
}

function insertStylesheetWithOnloadListener(url, passThroughData) {
    return new Promise((resolve, reject) => {
        var style = document.createElement('style');
        console.log(style);
        style.textContent = '@import "' + url + '"';
        document.head.appendChild(style);
        var onload = setInterval(function() {
          try {
            style.sheet.cssRules;
            console.log("Die Promise-Funktion");
            clearInterval(onload);
            resolve(passThroughData);
          } catch (e){}
        }, 10);
    })
}

function applyStylesToWidgetWithJS(box) {
    console.log(box);
    var widgetLists = ["#graph", "#sensors", "#history"];
    for (var i in widgetLists) {
        var currentWidgetList = document.querySelector(widgetLists[i]);
        adjustMarginTopWithParentHeight(document.querySelector(".widget"), currentWidgetList, {
            top: 0.12
        });
    };
    adjustPaddingTopWithParentHeight(document.querySelector(".widget-header"), document.querySelector(".widget-header img"), {
        top: 0.1,
        bottom: 0.1
    });
    appendTitle(box.name);
    appendDescription(box.description);
    setFooterLinkHref();
    setFooterFontSize();
}

function loadJSAsync(url, passThroughData) {
    return new Promise((resolve, reject) => {
        var scriptTag = document.createElement("script");
        scriptTag.type = 'text/javascript';
        scriptTag.src = url;
        scriptTag.onreadystatechange = () => resolve(passThroughData);
        scriptTag.onload = () => resolve(passThroughData);
        document.head.appendChild(scriptTag)
    })
}

function reduceAmountOfDrawnData(data) {
    var resarr = [];
    if (data.length >= 1000) {
        var dataLengthString = String(data.length)
        var steps = dataLengthString.substring(0, dataLengthString.length - 3) * 2;
        for (var i = 0; i < data.length; i += steps) {
            if (i < 10) console.log(data[i])
            resarr.push(data[i])
        }
    } else {
        resarr = data
    };
    return resarr
}

function setFooterLinkHref() {
    var footerLink = document.querySelector(".widget-footer").firstElementChild;
    console.log(footerLink);
    footerLink.href = "https://opensensemap.org/explore/" + sensebox;
}

function setFooterFontSize() {
    document.querySelector(".widget-footer").style.fontSize = document.querySelector(".widget").offsetHeight >= 400 ? "14px" : "11px"
}