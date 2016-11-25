// requêtes HTTP avec Promises !
// returns xhr object, used by getUrlAsXXX() functions
// postargs can be an object or string. 
function getUrl(url, postargs) {
    // Return a new promise.
    return new Promise(function (resolve, reject) {
        var method = postargs ? "POST" : "GET";

        var xhr = new XMLHttpRequest();
        xhr.open(method, url);
        if (postargs)
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

        xhr.onload = function () {
            // This is called even on 404 etc
            // so check the status
            if (xhr.status == 200) {
                // Resolve the promise with the request object
                // so downstream functions have full access.
                resolve(xhr);
            }
            else {
                // Otherwise reject with the status text
                // which will hopefully be a meaningful error
                reject(Error("HTTP " + xhr.status + " " + xhr.statusText + " while getting " + url));
            }
        };

        // Handle network errors
        xhr.onerror = function () {
            reject("Network Error");
        };

        // Make the request
        var argumentString = "";
        var firstPass = 1;
        if (nTypeof(postargs) == "object") {
            for (var key in postargs) {
                if (!postargs.hasOwnProperty(key))
                    continue;
                argumentString += !firstPass ? "&" : "";
                argumentString += key + "=" + postargs[key];
                firstPass = 0;
            }
        } else if (nTypeof(postargs) == "string")
            argumentString = postargs;

        xhr.send(argumentString);
    });
}
//returns text result of url request
function getUrlAsText(url, postargs) {
    return getUrl(url, postargs).then(
		function (xhr) { return xhr.response; }
	)
}
//returns parsed json result of url request
function getUrlAsJson(url, postargs) {
    return getUrl(url, postargs).then(
		function (xhr) {
		    try {
		        if (xhr.response === "")
		            return null;
		        else
		            return JSON.parse(xhr.response);
		    } catch (err) {
		        throw new Error("Response is not JSON. Error parsing the result from " + url)
		    }
		}
	)
}
//returns responseXml property of url request
function getUrlAsXml(url, postargs) {
    return getUrl(url, postargs).then(
		function (xhr) {
		    return xhr.responseXML;
		}
	)
}
// saves response locally as a download, without leaving the requesting page !
function getUrlAsDownload(url, postargs) {
    return getUrl(url, postargs, 'arraybuffer').then(
		function (xhr) {
		    var filename = "";
		    var disposition = xhr.getResponseHeader('Content-Disposition');
		    if (disposition && disposition.indexOf('attachment') !== -1) {
		        var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
		        var matches = filenameRegex.exec(disposition);
		        if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
		    }
		    var type = xhr.getResponseHeader('Content-Type');

		    var blob = new Blob([xhr.response], { type: type });
		    if (typeof window.navigator.msSaveBlob !== 'undefined') {
		        // IE workaround for "HTML7007: One or more blob URLs were revoked by closing the blob for which they were created. These URLs will no longer resolve as the data backing the URL has been freed."
		        window.navigator.msSaveBlob(blob, filename);
		    } else {
		        var URL = window.URL || window.webkitURL;
		        var downloadUrl = URL.createObjectURL(blob);

		        if (filename) {
		            // use HTML5 a[download] attribute to specify filename
		            var a = document.createElement("a");
		            // safari doesn't support this yet
		            if (typeof a.download === 'undefined') {
		                window.location = downloadUrl;
		            } else {
		                a.href = downloadUrl;
		                a.download = filename;
		                document.body.appendChild(a);
		                a.click();
		            }
		        } else {
		            window.location = downloadUrl;
		        }
		        setTimeout(function () { URL.revokeObjectURL(downloadUrl); }, 100); // cleanup
		    }
		}
	);
}

var waitingCaller;
// Calling between windows
function GO(target, url) {
    if (target = "new"){
        target = window.open(
            "",
            "child",
            "width=420,height=230,resizable,scrollbars=yes,status=1"
        );
    }
    else
        target = target.contentWindow;
    return new Promise(function (resolve, reject) {
        //first retrieve via AJAX to put in browser cache and recover eventual errors
        getUrl(url).then(
            function (xhr) {
                //ignore the response and change location with same url
                waitingCaller = resolve; //We're not storing reject because we can't trap errors. From here we assume success.
                target.location = url;
                target.onload = connectWaitingCaller.bind(this, target);
            },
            function (err) { reject(err) }
        )
    });
}
function connectWaitingCaller(loadedWindow, event) {
    waitingCaller(loadedWindow); //Call resolve, passing window reference
    waitingCaller = null; //caller no longer waiting
}

// Typeof
// https://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
nTypeof = function (obj) {
	return ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
}