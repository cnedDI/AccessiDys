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

angular.module('cnedApp').controller('MyBackupCtrl', function ($scope, $rootScope, UserService, DropboxProvider, $stateParams, CacheProvider, auth) {
    $scope.storages = [{
        provider: 'dropbox',
        img: 'https://pbs.twimg.com/profile_images/662300942335737857/vJbiuGpn.png',
        name: 'Dropbox'
    }];

    $scope.prevState = $stateParams.prevState;
    $scope.file = $stateParams.file;

    $scope.selectedStorage = {};

    /**
     * Select a storage to login
     * @param storage
     */
    $scope.selectStorage = function (storage) {
        $scope.selectedStorage = storage;
    };

    /**
     * Login to selected storage
     */
    $scope.login = function () {

        if($scope.prevState){
            CacheProvider.setItem({
                prevState: $scope.prevState,
                file: $scope.file
            }, 'myBackupRouteData');
        }

        if ($scope.selectedStorage.provider === 'dropbox') {
            DropboxProvider.auth();
        }
    };

    $scope.cancel = function(){
        if($scope.prevState){
            $rootScope.$state.go($scope.prevState);
        } else {
            $rootScope.$state.go('app.list-document');
        }
    };

});