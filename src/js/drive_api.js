/**
 * Authenticate google user for google drive by OAuth2.
 * @param {Function} callback Function to call when the request is complete.
 */
function auth(callback) {
  if (gapi.auth.getToken() != null) {
    callback(gapi.auth.getToken());
  	return;
  }
  var config = {
    'client_id': '739284067114-k1fs00c8nkigje81cf53rmv8vjt5hnde.apps.googleusercontent.com',
    'scope': [
      'https://www.googleapis.com/auth/drive'
    ],
    'immediate': true
  };
  gapi.auth.authorize(config, function(token) {
//     console.log('login complete' + token);
    gapi.client.load('drive', 'v2');
    callback(token);
  });
}

/**
 * sign out google account.
 */
function signOut() {
  if (gapi.auth.getToken() == null) {
  	return;
  }
  gapi.auth.signOut();
}

/**
 * Retrieve a list of File resources.
 * @param {Object} params to be sent with request. (query params)
 * @param {Function} callback Function to call when the request is complete.
 * @see https://developers.google.com/drive/v2/reference/files/list
 */
function listAllFiles(reqParams, callback) {
  var retrievePageOfFiles = function(request, result) {
    request.execute(function(resp) {
      result = result.concat(resp.items);
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
  reqParams.maxResults = limitCount;
  var request = gapi.client.drive.files.list(reqParams);
  request.execute(function(resp) {
    callback(resp.items);
  });
}
