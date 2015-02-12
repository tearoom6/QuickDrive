var module = angular.module('QuickDrive', []);
module.config(function ($compileProvider) {
  // url whitelist
  $compileProvider.aHrefSanitizationWhitelist (/^\s*(https?|ftp|mailto|file|tel|chrome-extension):/);
});
module.controller('PopupCtrl', ['$scope', '$filter', '$interval', function PopupCtrl($scope, $filter, $interval) {
  // constants
  const MAX_LIST_COUNT = 20;
  const TYPE_RECENT = 'recent';
  const TYPE_FAVORITE = 'favorite';
  const TYPE_SEARCH = 'search';
  $scope.TYPE_RECENT = TYPE_RECENT;
  $scope.TYPE_FAVORITE = TYPE_FAVORITE;
  $scope.TYPE_SEARCH = TYPE_SEARCH;
  // angular functions
  var orderBy = $filter('orderBy');
  // resources
  $scope.title = chrome.i18n.getMessage('extName');
  $scope.reset = chrome.i18n.getMessage('reset');
  $scope.search = chrome.i18n.getMessage('search');
  $scope.clear = chrome.i18n.getMessage('clear');
  $scope.search_text = chrome.i18n.getMessage('search_text');
  $scope.search_result = chrome.i18n.getMessage('search_result');
  $scope.recent = chrome.i18n.getMessage('recent');
  $scope.favorite = chrome.i18n.getMessage('favorite');
  $scope.lastViewedAt = chrome.i18n.getMessage('lastViewedAt');
  $scope.dateFormat = chrome.i18n.getMessage('dateFormat');
  // default value
  $scope.active = TYPE_FAVORITE;
  $scope.searchText = '';
  $scope.items = [];
  
  /* 定期処理 */
  // このタイミングで表示更新もかかる
//   $interval(function () {
//   }, 1000);
  
  /* 初期化処理(1度きり実行) */
  $interval(function() {
    auth(true, function() {
      listLimitedFiles({'q': 'trashed = false and starred = true'}, MAX_LIST_COUNT, function(result) {
        $scope.items = orderBy(result, 'lastViewedByMeDate', true);
        $scope.$apply(); // 強制画面更新
      });
    });
  }, 500, 1);
  
  /* タブの状態 */
  $scope.isActiveTab = function(type) {
    return $scope.active == type;
  };
  
  /* 検索BOX */
  $scope.searchItems = function() {
  	if ($scope.searchText == null || $scope.searchText == '') {
  	  return;
  	}
  	$scope.active = TYPE_SEARCH;
    listLimitedFiles({'q': 'trashed = false and fullText contains \'' + $scope.searchText + '\''}, MAX_LIST_COUNT, function(result) {
      $scope.items = orderBy(result, 'lastViewedByMeDate', true);
      $scope.$apply(); // 強制画面更新
    });
  };
  $scope.clearSearchBox = function() {
    $scope.searchText = '';
  };
  
  /* 認証トークンのリセット */
  $scope.resetAuthToken = function() {
    resetAuth(false);
  };
  
  /* タブを押した時の処理 */
  $scope.listItems = function(type) {
    auth(true, function() {
      if (type == TYPE_RECENT) {
        $scope.active = TYPE_RECENT;
        var now = new Date();
        now.setMonth(now.getMonth() - 1);
//         console.log(now.toISOString());
        listLimitedFiles({'q': 'trashed = false and lastViewedByMeDate >= \'' + now.toISOString() + '\''}, MAX_LIST_COUNT, function(result) {
          $scope.items = orderBy(result, 'lastViewedByMeDate', true);
//           $scope.items = orderBy(result, 'modifiedByMeDate', true);
          $scope.$apply(); // 強制画面更新
        });
      } else if (type == TYPE_FAVORITE) {
        $scope.active = TYPE_FAVORITE;
        listLimitedFiles({'q': 'trashed = false and starred = true'}, MAX_LIST_COUNT, function(result) {
          $scope.items = orderBy(result, 'lastViewedByMeDate', true);
//           $scope.items = orderBy(result, 'modifiedByMeDate', true);
          $scope.$apply(); // 強制画面更新
        });
      } else if (type == TYPE_SEARCH) {
        $scope.active = TYPE_SEARCH;
        $scope.items = [];
      }
    });
  };
}]);

/**
 * initialize Google API client for js
 */
function init() {
  auth(true, function() {});
}
