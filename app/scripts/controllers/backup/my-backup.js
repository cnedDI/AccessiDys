/* File: my-backup.js
 *
 * Copyright (c) 2013-2016
 * Centre National d’Enseignement à Distance (Cned), Boulevard Nicephore Niepce, 86360 CHASSENEUIL-DU-POITOU, France
 * (direction-innovation@cned.fr)
 *
 * GNU Affero General Public License (AGPL) version 3.0 or later version
 *
 * This file is part of a program which is free software: you can
 * redistribute it and/or modify it under the terms of the
 * GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this program.
 * If not, see <http://www.gnu.org/licenses/>.
 *
 */

'use strict';

angular.module('cnedApp').controller('MyBackupCtrl', function ($scope, $rootScope, UserService, DropboxProvider, $stateParams,
                                                               CacheProvider, UtilsService, GoogleDriveProvider, OneDriveProvider) {
    $scope.storages = [{
        provider: 'dropbox',
        icon: 'fa-dropbox',
        name: 'Dropbox',
        isActive: true
    }, {
        provider: 'google-drive',
        icon: 'fa-google',
        name: 'Google drive',
        isActive: true
    }, {
        provider: 'one-drive',
        icon: 'fa-cloud',
        name: 'One drive',
        isActive: true
    }];

    $scope.prevState = $stateParams.prevState;
    $scope.file = $stateParams.file;

    $scope.selectedStorage = {};

    var logout = function (cb) {
        UserService.logout();
        CacheProvider.setItem(null, 'listDocument').then(function(){
            CacheProvider.setItem(null, 'listProfile').then(function(){
                if(cb){
                    cb();
                }
            });
        });
    };

    if($stateParams.logout && UserService.getData().provider){
        logout(function(){
            window.location.reload();
        });
    }

    /**
     * Select a storage to login
     * @param storage
     */
    $scope.selectStorage = function (storage) {
        if (storage.isActive) {
            $scope.selectedStorage = storage;
        }
    };

    /**
     * Login to selected storage
     */
    $scope.login = function () {

        if ($scope.prevState) {
            CacheProvider.setItem({
                prevState: $scope.prevState,
                file: $scope.file
            }, 'myBackupRouteData');
        }

        logout(function(){
            if ($scope.selectedStorage.provider === 'dropbox') {
                DropboxProvider.auth();
            } else if ($scope.selectedStorage.provider === 'google-drive'){
                GoogleDriveProvider.auth();
            } else if ($scope.selectedStorage.provider === 'one-drive'){
                OneDriveProvider.auth();
            }
        });


    };

    $scope.cancel = function () {
        if ($scope.prevState) {
            $rootScope.$state.go($scope.prevState);
        } else {
            $rootScope.$state.go('app.list-document');
        }
    };

    $scope.logout = function () {
        UtilsService.openConfirmModal('label.logout', 'label.logout.confirm', false)
            .then(function () {
                logout(function(){
                    window.location.reload();
                });
            });
    };



});