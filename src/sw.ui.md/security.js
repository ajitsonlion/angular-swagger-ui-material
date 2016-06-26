'use strict';

angular.module('sw.ui.md')
    .factory('security', function ($q, $http, $timeout, $interval, $window, $rootScope, dialog, data) {
        var storage = $window.sessionStorage;
        var securityDefinitions;
        var credentials;
        var host;
        var config;


        var deReg = $rootScope.$on('sw:changed', setSwagger);

        $rootScope.$on('$destroy', function () {
            deReg();
        });

        return {
            execute: execute,
            showSecurity: showSecurity,
            showProxy: showProxy
        };

        function setSwagger() {

            host = '';
            console.log('host ', host);
            securityDefinitions = {api_key: {
                type: "apiKey",
                name: "X-Keycloak-Refresh-Token",
                in: "header"
            }};
            console.log('securityDefinitions ', securityDefinitions);

            init();

        }

        function init() {
            var stored = storage.getItem('swaggerUiSecurity:' + host);
            credentials = stored ? angular.fromJson(stored) : {};

            angular.forEach(securityDefinitions, function (sec, name) {
                if (sec.type === 'apiKey') {
                    credentials[name] = credentials[name] || '';
                    console.log('api key ', sec.name);
                }
            });
        }

        function saveCredentials() {
            storage.setItem('swaggerUiSecurity:' + host, angular.toJson(credentials));
        }

        function execute(options) {
            var deferred = $q.defer();

            if (data.options.proxy) {
                console.log(' proxy options', options);
                console.log(' data.options.proxy', data.options.proxy);

                options.url = data.options.proxy + options.url;
                console.log(' proxy options after ', options);
            }

            angular.forEach(securityDefinitions, function (sec, name) {
                console.log('working on ', sec, name);
                if (sec.type === 'apiKey') {
                    if (sec.in === 'header') {
                        options.headers[sec.name] = credentials[name].apiKey;
                         console.log(' options now are ',options);
                    } else if (sec.in === 'query') {
                        options.params[sec.name] = credentials[name].apiKey;
                    }
                }
            });

            deferred.resolve();

            return deferred.promise;
        }

        function getScopeKey(name, sec) {
            var scopes = [];

            angular.forEach(sec.scopes, function (v, k) {
                scopes.push(k);
            });

            return name + ':' + hashCode(scopes.join(' '));
        }

        function initScopes(sec) {
            var obj = {};

            angular.forEach(sec.scopes, function (v, k) {
                obj[k] = true;
            });

            return obj;
        }

        function getSelectedScopes(sec) {
            var s = [];

            angular.forEach(credentials[sec.scopeKey].scopes, function (v, k) {
                if (v) {
                    s.push(k);
                }
            });

            return s.join('+');
        }

        // from http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
        function hashCode(text) {
            var hash = 0;

            if (text.length === 0) {
                return hash;
            }

            for (var i = 0; i < text.length; i++) {
                var character = text.charCodeAt(i);

                hash = ((hash << 5) - hash) + character;
                hash = (hash & hash) + 0x80000000;
            }

            return hash.toString(16);
        }

        function showSecurity($event) {
            showInternal($event);
        }

        function showProxy($event) {
            dialog.show($event, {
                options: data.options
            }, 'proxy');
        }

        function showInternal($event) {
            var locals = {
                security: securityDefinitions,
                credentials: credentials,
                singleSecurity: Object.keys(securityDefinitions || {}).length === 1
            };

            var toBeDestroyed = $rootScope.$watch(function () {
                return credentials;
            }, saveCredentials, true);

            angular.forEach(securityDefinitions,
                function (sec) {
                    if (sec.type === 'apiKey') {
                        console.log('show inter for api key');
                    } else if (sec.type === 'basic') {
                    }
                }
            );

            dialog.show($event, locals, 'security').then(function () {
                toBeDestroyed();
            });
        }

        function friendlyScopes(sec) {
            var obj = {};

            angular.forEach(sec.scopes, function (v, k) {
                obj[k] = k.replace(/^.*\/([^\/]+)$/g, '$1') || k;
            });

            return obj;
        }

        function counter(sec, locals) {
            var c = credentials[sec.scopeKey];

            if (c.expiresIn) {
                sec.counter = Math.round((c.expiresFrom + c.expiresIn * 1000 - Date.now()) / 1000) + ' seconds';
            }

            var promise = $interval(function () {
                if (!locals.opened) {
                    $interval.cancel(promise);
                }

                if (c.expiresIn) {
                    sec.counter = Math.round((c.expiresFrom + c.expiresIn * 1000 - Date.now()) / 1000) + ' seconds';
                }
            }, 1000);
        }
    })
    .run(function (plugins, security) {
        plugins.add(plugins.BEFORE_EXPLORER_LOAD, security);
    });
