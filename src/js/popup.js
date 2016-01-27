var module = angular.module('QuickDrive', []);
module.config(function ($compileProvider) {
  // url whitelist
  $compileProvider.aHrefSanitizationWhitelist (/^\s*(https?|ftp|mailto|file|tel|chrome-extension):/);
});
module.controller('PopupCtrl', ['$scope', '$window', '$filter', '$interval', function PopupCtrl($scope, $window, $filter, $interval) {
  // constants
  const MAX_LIST_COUNT = 20;
  const REQUEST_FIELDS = 'files(iconLink,id,kind,mimeType,name,viewedByMeTime,webContentLink,webViewLink),nextPageToken';
  const TYPE_RECENT = 'recent';
  const TYPE_FAVORITE = 'favorite';
  const TYPE_SEARCH = 'search';
  const SAVE_KEY_RESULT_MAP = {};
  SAVE_KEY_RESULT_MAP[TYPE_RECENT] = 'recentResult';
  SAVE_KEY_RESULT_MAP[TYPE_FAVORITE] = 'favoriteResult';
  SAVE_KEY_RESULT_MAP[TYPE_SEARCH] = 'searchResult';
  const SAVE_KEY_SEARCH_TEXT = 'searchText';
  const DEFAULT_TYPE = TYPE_FAVORITE;
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
  $scope.active = DEFAULT_TYPE;
  $scope.canResetAuth = true;
  $scope.searchText = '';
  $scope.items = [];

  /* タブの状態 */
  $scope.isActiveTab = function(type) {
    return $scope.active == type;
  };

  /* 操作キャッシュ */
  $scope.requestCache = {};
  $scope.saveRequestCache = function(type, req, nextPageToken) {
    req.pageToken = nextPageToken;
    $scope.requestCache[type] = req;
  }
  $scope.getRequestCache = function(type) {
    return $scope.requestCache[type];
  }
  $scope.clearRequestCache = function(type) {
    if (type in $scope.requestCache)
      delete $scope.requestCache[type];
  }

  /* ローカルストレージ */
  $scope.saveLocal = function(key, value) {
    var storeObj = {};
    storeObj[key] = value;
    chrome.storage.local.set(storeObj);
  }
  $scope.loadLocal = function(key, callback) {
    chrome.storage.local.get(key, callback);
  }
  $scope.clearLocal = function() {
    chrome.storage.local.clear();
  }

  /* ファイル取得 */
  $scope.retrieveItems = function(type, request, orderAttr, isAdditional) {
    listLimitedFiles(request, MAX_LIST_COUNT, function(items, nextPageToken) {
      if (isAdditional && !$scope.isActiveTab(type))
        // 追加取得の場合はマージする関係上、データの不整合が起きないよう気をつける
        return;
      if (nextPageToken) {
        // 残りのファイルがある場合(最終ページでない)
        $scope.saveRequestCache(type, request, nextPageToken);
      } else {
        // すべてのファイルを取得した場合(最終ページ)
        $scope.clearRequestCache(type);
      }
      if (!isAdditional) {
        // 1ページ目取得時
        $scope.items = orderBy(items, orderAttr, true);
      } else {
        // 2ページ目以降取得時
        $scope.items = $scope.items.concat(orderBy(items, orderAttr, true));
      }
      $scope.$apply(); // 強制画面更新
      $scope.saveLocal(SAVE_KEY_RESULT_MAP[type], $scope.items);
    });
  }

  /* 検索BOX */
  $scope.kickSearchItems = function(keyEvent) {
    if (keyEvent.keyCode === 13) {
      $scope.searchItems();
    }
  }
  $scope.searchItems = function() {
  	if ($scope.searchText == null || $scope.searchText == '') {
  	  return;
  	}
    $scope.saveLocal(SAVE_KEY_SEARCH_TEXT, $scope.searchText);
    $scope.canResetAuth = true;
  	$scope.active = TYPE_SEARCH;
    $scope.clearRequestCache(TYPE_SEARCH);
    $scope.retrieveItems(TYPE_SEARCH, {'fields': REQUEST_FIELDS, 'q': 'trashed = false and fullText contains \'' + $scope.searchText + '\''}, 'viewedByMeTime', false);
  };
  $scope.clearSearchBox = function() {
    $scope.searchText = '';
    $scope.clearLocal();
  };

  /* 認証トークンのリセット */
  $scope.isDisabledToResetAuth = function() {
    return !$scope.canResetAuth;
  }
  $scope.resetAuthToken = function() {
    resetAuth(false);
    $scope.canResetAuth = false;
    $scope.active = TYPE_FAVORITE;
    $scope.items = [];
    $scope.clearSearchBox();
  };

  /* 初期データロード */
  $scope.loadLocal(SAVE_KEY_SEARCH_TEXT, function(items) {
    if (items != null && items.searchText != null) {
      $scope.searchText = items.searchText;
    }
  });
  $scope.loadLocal(SAVE_KEY_RESULT_MAP[DEFAULT_TYPE], function(items) {
    if (items != null && items.favoriteResult != null) {
      $scope.items = items.favoriteResult;
    }
  });

  /* 定期処理 */
  // このタイミングで表示更新もかかる
//   $interval(function () {
//   }, 1000);

  /* 初期化処理(1度きり実行) */
  $interval(function() {
    // スクロール位置取得用要素のキャッシュ
    $scope.elScrollable = document.body;
    if (navigator.userAgent.indexOf('WebKit') < 0)
      $scope.elScrollable = document.documentElement;
    // ページ下端までスクロールした際のイベント登録
    angular.element($window).bind("scroll", function() {
      var scrollTop = $scope.elScrollable.scrollTop;
      var windowHeight = document.documentElement.clientHeight;
      var pageHeight = $scope.elScrollable.scrollHeight;
      if (scrollTop + windowHeight < pageHeight)
        // ページ下端に達していない場合は何もしない
        return;
      var type = $scope.active;
      var req = $scope.getRequestCache(type);
      if (!req)
        return;
      $scope.retrieveItems(type, req, 'viewedByMeTime', true);
    });
    auth(true, function() {
      // デフォルトの表示リスト取得
      $scope.retrieveItems(DEFAULT_TYPE, {'fields': REQUEST_FIELDS, 'q': 'trashed = false and starred = true', 'orderBy': 'viewedByMeTime desc'}, 'viewedByMeTime', false);
    });
  }, 500, 1);

  /* タブを押した時の処理 */
  $scope.listItems = function(type) {
    $scope.canResetAuth = true;
    auth(true, function() {
      if (type == TYPE_RECENT) {
      	// 最近使用タブ
        $scope.active = TYPE_RECENT;
        $scope.clearRequestCache(TYPE_RECENT);
        $scope.loadLocal(SAVE_KEY_RESULT_MAP[TYPE_RECENT], function(items) {
          if (items != null && items.recentResult != null) {
            $scope.items = items.recentResult;
            $scope.$apply(); // 強制画面更新
          }
          // 6ヶ月前までのファイルを検索
          $scope.retrieveItems(TYPE_RECENT, {'fields': REQUEST_FIELDS, 'q': 'trashed = false and viewedByMeTime >= \'' + moment().subtract(6, 'months').toISOString() + '\'', 'orderBy': 'viewedByMeTime desc'}, 'viewedByMeTime', false);
        });
      } else if (type == TYPE_FAVORITE) {
      	// スター付きタブ
        $scope.active = TYPE_FAVORITE;
        $scope.clearRequestCache(TYPE_FAVORITE);
        $scope.loadLocal(SAVE_KEY_RESULT_MAP[TYPE_FAVORITE], function(items) {
          if (items != null && items.favoriteResult != null) {
            $scope.items = items.favoriteResult;
            $scope.$apply(); // 強制画面更新
          }
          $scope.retrieveItems(TYPE_FAVORITE, {'fields': REQUEST_FIELDS, 'q': 'trashed = false and starred = true', 'orderBy': 'viewedByMeTime desc'}, 'viewedByMeTime', false);
        });
      } else if (type == TYPE_SEARCH) {
      	// 検索結果タブ
        $scope.active = TYPE_SEARCH;
        $scope.items = [];
        $scope.loadLocal(SAVE_KEY_RESULT_MAP[TYPE_SEARCH], function(items) {
          if (chrome.runtime.lastError != null) {
            console.log(chrome.runtime.lastError);
            return;
          }
          if (items != null && items.searchResult != null) {
            $scope.items = items.searchResult;
            $scope.$apply(); // 強制画面更新
          }
        });
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
