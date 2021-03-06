(function()
{
    'use strict';

    angular
        .module('lumx.search-filter')
        .filter('lxSearchHighlight', lxSearchHighlight)
        .directive('lxSearchFilter', lxSearchFilter);

    lxSearchHighlight.$inject = ['$sce'];

    function lxSearchHighlight($sce)
    {
        function escapeRegexp(queryToEscape)
        {
            return queryToEscape.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
        }

        return function (matchItem, query, icon)
        {
            var string = '';

            if (icon)
            {
                string += '<i class="mdi mdi-' + icon + '"></i>';
            }

            string += query && matchItem ? matchItem.replace(new RegExp(escapeRegexp(query), 'gi'), '<strong>$&</strong>') : matchItem;

            return $sce.trustAsHtml(string);
        };
    }

    function lxSearchFilter()
    {
        return {
            restrict: 'E',
            templateUrl: 'search-filter.html',
            scope:
            {
                autocomplete: '&?lxAutocomplete',
                closed: '=?lxClosed',
                color: '@?lxColor',
                icon: '@?lxIcon',
                searchOnFocus: '=?lxSearchOnFocus',
                width: '@?lxWidth'
            },
            link: link,
            controller: LxSearchFilterController,
            controllerAs: 'lxSearchFilter',
            bindToController: true,
            replace: true,
            transclude: true
        };

        function link(scope, element, attrs, ctrl, transclude)
        {
            var input;

            attrs.$observe('lxWidth', function(newWidth)
            {
                if (angular.isDefined(scope.lxSearchFilter.closed) && scope.lxSearchFilter.closed)
                {
                    element.find('.search-filter__container').css('width', newWidth);
                }
            });

            transclude(function()
            {
                input = element.find('input');

                ctrl.setInput(input);
                ctrl.setModel(input.data('$ngModelController'));

                input.on('focus', ctrl.focusInput);
                input.on('blur', ctrl.blurInput);
                input.on('keydown', ctrl.keyEvent);
            });

            scope.$on('$destroy', function()
            {
                input.off();
            });
        }
    }

    LxSearchFilterController.$inject = ['$element', '$scope', 'LxDropdownService', 'LxNotificationService', 'LxUtils'];

    function LxSearchFilterController($element, $scope, LxDropdownService, LxNotificationService, LxUtils)
    {
        var lxSearchFilter = this;
        var input;
        var itemSelected = false;

        lxSearchFilter.blurInput = blurInput;
        lxSearchFilter.clearInput = clearInput;
        lxSearchFilter.focusInput = focusInput;
        lxSearchFilter.getClass = getClass;
        lxSearchFilter.keyEvent = keyEvent;
        lxSearchFilter.openInput = openInput;
        lxSearchFilter.selectItem = selectItem;
        lxSearchFilter.setInput = setInput;
        lxSearchFilter.setModel = setModel;

        lxSearchFilter.activeChoiceIndex = -1;
        lxSearchFilter.color = angular.isDefined(lxSearchFilter.color) ? lxSearchFilter.color : 'black';
        lxSearchFilter.dropdownId = LxUtils.generateUUID();

        ////////////

        function blurInput()
        {
            if (angular.isDefined(lxSearchFilter.closed) && lxSearchFilter.closed && !input.val())
            {
                $element.velocity(
                {
                    width: 40
                },
                {
                    duration: 400,
                    easing: 'easeOutQuint',
                    queue: false
                });
            }
        }

        function clearInput()
        {
            lxSearchFilter.modelController.$setViewValue(undefined);
            lxSearchFilter.modelController.$render();

            input.focus();
        }

        function focusInput()
        {
            if (!lxSearchFilter.searchOnFocus)
            {
                return;
            }

            updateAucomplete(lxSearchFilter.modelController.$viewValue);
        }

        function getClass()
        {
            var searchFilterClass = [];

            if (angular.isUndefined(lxSearchFilter.closed) || !lxSearchFilter.closed)
            {
                searchFilterClass.push('search-filter--opened-mode');
            }

            if (angular.isDefined(lxSearchFilter.closed) && lxSearchFilter.closed)
            {
                searchFilterClass.push('search-filter--closed-mode');
            }

            if (input.val())
            {
                searchFilterClass.push('search-filter--has-clear-button');
            }

            if (angular.isDefined(lxSearchFilter.color))
            {
                searchFilterClass.push('search-filter--' + lxSearchFilter.color);
            }

            if (angular.isFunction(lxSearchFilter.autocomplete))
            {
                searchFilterClass.push('search-filter--autocomplete');
            }

            if (LxDropdownService.isOpen(lxSearchFilter.dropdownId))
            {
                searchFilterClass.push('search-filter--is-open');
            }

            return searchFilterClass;
        }

        function keyEvent(_event)
        {
            if (!angular.isFunction(lxSearchFilter.autocomplete))
            {
                return;
            }

            if (!LxDropdownService.isOpen(lxSearchFilter.dropdownId))
            {
                lxSearchFilter.activeChoiceIndex = -1;
            }

            switch (_event.keyCode) {
                case 13:
                    keySelect();
                    _event.preventDefault();
                    break;

                case 38:
                    keyUp();
                    _event.preventDefault();
                    break;

                case 40:
                    keyDown();
                    _event.preventDefault();
                    break;
            }

            $scope.$apply();
        }

        function keyDown()
        {
            if (lxSearchFilter.autocompleteList.length)
            {
                lxSearchFilter.activeChoiceIndex += 1;

                if (lxSearchFilter.activeChoiceIndex >= lxSearchFilter.autocompleteList.length)
                {
                    lxSearchFilter.activeChoiceIndex = 0;
                }
            }
        }

        function keySelect()
        {
            itemSelected = true;

            LxDropdownService.close(lxSearchFilter.dropdownId);

            lxSearchFilter.modelController.$setViewValue(lxSearchFilter.autocompleteList[lxSearchFilter.activeChoiceIndex]);
            lxSearchFilter.modelController.$render();
        }

        function keyUp()
        {
            if (lxSearchFilter.autocompleteList.length)
            {
                lxSearchFilter.activeChoiceIndex -= 1;

                if (lxSearchFilter.activeChoiceIndex < 0)
                {
                    lxSearchFilter.activeChoiceIndex = lxSearchFilter.autocompleteList.length - 1;
                }
            }
        }

        function openInput()
        {
            if (angular.isDefined(lxSearchFilter.closed) && lxSearchFilter.closed)
            {
                $element.velocity(
                {
                    width: angular.isDefined(lxSearchFilter.width) ? parseInt(lxSearchFilter.width) : 240
                },
                {
                    duration: 400,
                    easing: 'easeOutQuint',
                    queue: false,
                    complete: function()
                    {
                        input.focus();
                    }
                });
            }
            else
            {
                input.focus();
            }
        }

        function selectItem(_item)
        {
            itemSelected = true;

            lxSearchFilter.modelController.$setViewValue(_item);
            lxSearchFilter.modelController.$render();
        }

        function setInput(_input)
        {
            input = _input;
        }

        function setModel(_modelController)
        {
            lxSearchFilter.modelController = _modelController;

            if (angular.isFunction(lxSearchFilter.autocomplete))
            {
                if (angular.isDefined(lxSearchFilter.modelController.$overrideModelOptions))
                {
                    lxSearchFilter.modelController.$overrideModelOptions({ debounce: { 'default': 500 } });
                }
                else
                {
                    lxSearchFilter.modelController.$options = lxSearchFilter.modelController.$options || {};
                    lxSearchFilter.modelController.$options.updateOnDefault = true;
                    lxSearchFilter.modelController.$options.debounce = { 'default': 500 };
                }

                lxSearchFilter.modelController.$parsers.push(updateAucomplete);
            }
        }

        function updateAucomplete(_newValue)
        {
            if ((_newValue || (!_newValue && lxSearchFilter.searchOnFocus)) && !itemSelected && !lxSearchFilter.isLoading)
            {
                lxSearchFilter.isLoading = true;

                var promise = lxSearchFilter.autocomplete({ newValue: _newValue });

                promise.then(function(autocompleteList)
                {
                    lxSearchFilter.autocompleteList = autocompleteList;

                    if (lxSearchFilter.autocompleteList.length)
                    {
                        LxDropdownService.open(lxSearchFilter.dropdownId, $element);
                    }
                    else
                    {
                        LxDropdownService.close(lxSearchFilter.dropdownId);
                    }
                }).catch(function(error)
                {
                    LxNotificationService.error(error);
                }).finally(function()
                {
                    lxSearchFilter.isLoading = false;
                });
            } else {
                LxDropdownService.close(lxSearchFilter.dropdownId);
            }

            itemSelected = false;
        }
    }
})();