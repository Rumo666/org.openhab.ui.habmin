angular.module('HABmin.sitemap', [
  'ui.router',
  'HABmin.itemModel',
  'HABmin.sitemapModel',
  'sitemapFrameWidget',
  'sitemapSliderWidget',
  'sitemapSelectionWidget',
  'sitemapSwitchWidget',
  'sitemapTextWidget',
  'ui.bootstrap.tooltip'
]).config([
  '$stateProvider',
  function config($stateProvider) {
    $stateProvider.state('sitemap', {
      url: '/sitemap',
      abstract: true,
      views: { 'main': { templateUrl: 'sitemap/sitemap.tpl.html' } },
      data: { pageTitle: 'Sitemap Main' },
      controller: function ($scope, params) {
        console.log('Sitemap parameters:', params);
      }
    });
    $stateProvider.state('sitemap.view', {
      url: '/view/:sitemapName/:sitemapPage',
      data: { pageTitle: 'Sitemap View' },
      onEnter: function () {
        console.log('onEnter');
      },
      onExit: function () {
        console.log('onExit');
      }
    });
  }
]).directive('dynamicSitemap', [
  '$compile',
  'SitemapModel',
  '$stateParams',
  'ItemModel',
  function ($compile, SitemapModel, $stateParams, ItemModel) {
    return {
      restrict: 'A',
      replace: true,
      scope: {},
      controller: [
        '$scope',
        '$element',
        '$state',
        function ($scope, $element, $state) {
          var widgetMap = {
              Colorpicker: { directive: 'sitemap-text' },
              Chart: { directive: 'sitemap-text' },
              Frame: { directive: 'sitemap-frame' },
              Group: { directive: 'sitemap-frame' },
              Image: { directive: 'sitemap-text' },
              List: { directive: 'sitemap-text' },
              Selection: { directive: 'sitemap-selection' },
              Setpoint: { directive: 'sitemap-text' },
              Slider: { directive: 'sitemap-slider' },
              Switch: { directive: 'sitemap-switch' },
              Text: { directive: 'sitemap-text' },
              Video: { directive: 'sitemap-text' },
              Webview: { directive: 'sitemap-text' }
            };
          $scope.click = function (sitemapName, sitemapPage) {
            console.log('Clicked!', sitemapName, sitemapPage);
            $state.go('sitemap.view', {
              sitemapName: sitemapName,
              sitemapPage: sitemapPage
            }, { reload: true });
            setPage(sitemapName + '/' + sitemapPage);
          };
          $scope.$on('habminGUIUpdate', function (event, item, value) {
            console.log('Received command for', item, value);
            ItemModel.sendCommand(item, value);
          });
          $scope.$on('$destroy', function () {
            console.log('Destroy...');
            SitemapModel.cancelWatch();
          });
          var sitemapName = $stateParams.sitemapName;
          var sitemapPage = $stateParams.sitemapPage;
          setPage(sitemapName + '/' + sitemapPage);
          function setPage(pageAddress) {
            SitemapModel.getPage(pageAddress).then(function (data) {
              console.log('OPEN Response is', data);
              $element.empty();
              $compile(processPage(data))($scope).appendTo($element);
              SitemapModel.initWatch(pageAddress, updatePage);
            });
          }
          function updatePage(pageDef) {
            if (pageDef === null || pageDef.widget === undefined) {
              return '';
            }
            processWidgetUpdate(pageDef.widget);
            $scope.$digest();
            $scope.$broadcast('habminGUIRefresh');
            function processWidgetUpdate(widgetArray) {
              if (widgetArray == null) {
                return;
              }
              angular.forEach(widgetArray, function (widget) {
                if (widget == null) {
                  return;
                }
                if ($scope['w' + widget.widgetId] !== undefined) {
                  var t = processWidgetLabel(widget.label);
                  widget.label = t.label;
                  widget.value = t.value;
                  if (widget.item !== undefined) {
                    $scope['m' + widget.widgetId] = widget.item.state;
                    $scope['w' + widget.widgetId] = widget;
                  }
                }
                if (widget.widget !== undefined) {
                  processWidgetUpdate(widget.widget);
                }
              });
            }
          }
          function processPage(pageDef) {
            var pageTpl = '<div class="container sitemap-title"><div class="col-md-12">';
            if (pageDef.parent != null) {
              pageTpl += '<span tooltip="Back to ' + pageDef.parent.title + '" tooltip-placement="bottom" ng-click="click(\'' + sitemapName + '\',\'' + pageDef.parent.id + '\')" class="sitemap-parent back"></span>';
            } else {
              pageTpl += '<span class="sitemap-parent"></span>';
            }
            var title = processWidgetLabel(pageDef.title);
            pageTpl += '<span class="sitemap-title-icon">';
            pageTpl += '<img width="36px" src="../images/light_control.svg">';
            pageTpl += '</span>';
            pageTpl += '<span>' + title.label + '</span>';
            pageTpl += '<span class="pull-right">' + title.value + '</span></div></div>';
            pageTpl += '<div class="sitemap-body">';
            pageTpl += processWidget([].concat(pageDef.widget)) + '</div>';
            return pageTpl;
          }
          function processWidget(widgetArray) {
            if (widgetArray == null) {
              return '';
            }
            var output = '';
            angular.forEach(widgetArray, function (widget) {
              if (widget == null) {
                return;
              }
              var t = processWidgetLabel(widget.label);
              widget.label = t.label;
              widget.value = t.value;
              var state = '';
              if (widget.item != null) {
                state = widget.item.state;
              }
              var link = '';
              if (widget.linkedPage) {
                link = 'ng-click="click(\'' + sitemapName + '\',\'' + widget.linkedPage.id + '\')"';
              }
              var widgetClass = [];
              if (link !== '') {
                widgetClass.push('sitemap-link');
              }
              if (widgetMap[widget.type] === undefined) {
                console.error('Undefined widget found', widget);
                return;
              }
              var children = '';
              if (widget.widget != null) {
                children = '<div>' + processWidget([].concat(widget.widget)) + '</div>';
              } else {
                widgetClass.push('row');
                widgetClass.push('sitemap-row');
              }
              output += '<div class="' + widgetClass.join(' ') + '" id="' + widget.widgetId + '"' + link + '>' + '<' + widgetMap[widget.type].directive + ' widget="w' + widget.widgetId + '"' + ' item-model="m' + widget.widgetId + '"' + '>' + children + '</' + widgetMap[widget.type].directive + '>' + '</div>';
              if (widget.item !== undefined) {
                $scope['m' + widget.widgetId] = widget.item.state;
              }
              $scope['w' + widget.widgetId] = widget;
            });
            return output;
          }
          function processWidgetLabel(title) {
            if (title != null) {
              var matches = title.match(/\[(.*?)\]/g);
              var label = title;
              var value = '';
              if (matches != null && matches.length !== 0) {
                value = matches[matches.length - 1].substring(1, matches[matches.length - 1].length - 1);
                label = label.substr(0, label.indexOf(matches[matches.length - 1]));
              }
              return {
                label: label.trim(),
                value: value.trim()
              };
            } else {
              return {
                label: '',
                value: ''
              };
            }
          }
        }
      ]
    };
  }
]);