/**
 * Authenticate google user for google drive by OAuth2.
 * @param {Boolean} authenticate interactively
 * @param {Function} callback Function to call when the request is complete.
 */
function auth(interactive, callback) {
  if (gapi.auth.getToken() != null && gapi.client != null && gapi.client.drive != null && gapi.client.drive.files != null) {
    callback();
    return;
  }
  chrome.identity.getAuthToken({ 'interactive': interactive }, function(token) {
    if (token == null) {
      return;
    }
    gapi.auth.setToken({ 'access_token': token });
    gapi.client.load('drive', 'v3', callback);
  });
}

/**
 * Reset google user authentication.
 * @param {Boolean} authenticate interactively
 */
function resetAuth(interactive) {
  if (gapi.auth.getToken() == null) {
  	return;
  }
  var token = gapi.auth.getToken();
  chrome.identity.removeCachedAuthToken({ 'token': token.access_token }, function() {
    chrome.identity.getAuthToken({ 'interactive': interactive }, function(token) {
      if (token == null) {
        return;
      }
      gapi.auth.setToken({ 'access_token': token });
    });
  });
}

/**
 * Retrieve a list of File resources.
 * @param {Object} params to be sent with request. (query params)
 * @param {Function} callback Function to call when the request is complete.
 * @see https://developers.google.com/drive/v3/reference/files/list
 */
function listAllFiles(reqParams, callback) {
  var retrievePageOfFiles = function(request, result) {
    request.execute(function(resp) {
      result = result.concat(resp.files);
      var nextPageToken = resp.nextPageToken;
      if (nextPageToken) {
      	// sum up all items if response has multi-pages.
      	var nextParams = reqParams;
      	nextParams.pageToken = nextPageToken;
        request = gapi.client.drive.files.list(nextParams);
        retrievePageOfFiles(request, result);
      } else {
      	// at last, callback would be called.
        callback(result);
      }
    });
  }
  // initial request.
  var initialRequest = gapi.client.drive.files.list(reqParams);
  retrievePageOfFiles(initialRequest, []);
}

/**
 * Retrieve a list of File resources with limit count.
 * @param {Object} params to be sent with request. (query params)
 * @param {Integer} maximum count to retrieve files.
 * @param {Function} callback Function to call when the request is complete.
 */
function listLimitedFiles(reqParams, limitCount, callback) {
  // request with limit.
  reqParams.pageSize = limitCount;
  var request = gapi.client.drive.files.list(reqParams);
  request.execute(function(resp) {
    callback(resp.files, resp.nextPageToken);
  });
}
