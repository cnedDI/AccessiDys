/* File: main.js
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

angular.module('cnedApp')
    .controller('listDocumentCtrl', function ($scope, $rootScope,
                                              configuration, fileStorageService, Analytics,
                                              gettextCatalog, UtilsService, LoaderService, $log, documentService,
                                              ToasterService, _, $state, $filter) {

        $scope.configuration = configuration;
        $scope.sortType = 'dateModification';
        $scope.sortReverse = true;
        $scope.documentCount = 0;
        $scope.folderCount = 0;
        var fileIndex = 0;


        /**
         * Update document Note
         * @param operation
         */
        $scope.updateNote = function (operation) {
            var notes = [];
            var mapNotes = {};
            if (localStorage.getItem('notes')) {
                mapNotes = JSON.parse(angular.fromJson(localStorage.getItem('notes')));
                if (mapNotes.hasOwnProperty($scope.oldTitre)) {
                    if (operation === 'DELETE') {
                        delete mapNotes[$scope.oldTitre];
                    } else if (operation === 'EDIT') {
                        notes = mapNotes[$scope.oldTitre];
                        delete mapNotes[$scope.oldTitre];
                        mapNotes[$scope.nouveauTitre] = notes;
                    }
                    localStorage.setItem('notes', JSON.stringify(angular.toJson(mapNotes)));
                }
            }
        };

        /**
         * Delete a document
         * @param document The document to be deleted
         */
        $scope.deleteDocument = function (document) {

            var title = 'document.label.delete.title';
            var msg = 'document.label.delete.anwser';
            var loader = 'document.message.info.delete.inprogress';

            if (document.type == 'folder') {
                title = 'folder.label.delete.title';
                msg = 'folder.label.delete.anwser';
                loader = 'folder.message.info.delete.inprogress';
            }

            UtilsService.openConfirmModal(gettextCatalog.getString(title),
                gettextCatalog.getString(msg).replace('document.name', document.filename), true)
                .then(function () {
                    LoaderService.showLoader(loader, true);
                    LoaderService.setLoaderProgress(30);

                    fileStorageService.delete(document, 'document').then(function () {
                        LoaderService.setLoaderProgress(100);
                        LoaderService.hideLoader();
                        /* Removing notes of the document on localStorage */
                        $scope.updateNote('DELETE');
                        $scope.getListDocument();

                        ToasterService.showToaster('#list-document-success-toaster', 'document.message.info.delete.ok');
                    });
                });

            // angular-google-analytics tracking pages
            Analytics.trackPage('/document/delete.html');
        };

        /**
         * Rename a document title
         * @param document The document to be renamed
         */
        $scope.renameDocumentTitle = function (document) {

            documentService.editDocumentTitle(document.filename, [], 'edit')
                .then(function (params) {

                    LoaderService.setLoaderProgress(10);

                    if (document.type === 'file') {
                        LoaderService.showLoader('document.message.info.rename.inprogress', true);
                        fileStorageService.rename(document, params.title, 'document')
                            .then(function () {
                                LoaderService.setLoaderProgress(80);
                                $scope.updateNote('EDIT');
                                $scope.getListDocument();
                            });
                    } else if (document.type === 'folder') {
                        LoaderService.showLoader('folder.message.info.rename.inprogress', true);
                        fileStorageService.renameFolder(document, params.title)
                            .then(function () {
                                LoaderService.setLoaderProgress(80);
                                $scope.updateNote('EDIT');
                                $scope.getListDocument();
                            });
                    }
                });

            // angular-google-analytics tracking pages
            Analytics.trackPage('/document/edit-title.html');
        };

        /**
         * Share a document
         * @param document The document to share
         */
        $scope.shareDocument = function (document) {
            $log.debug('Share document', document);

            if (!$rootScope.isAppOnline) {
                UtilsService.showInformationModal('label.offline', 'document.message.info.share.offline');
            } else {

                var itemToShare = {
                    linkToShare: '',
                    name: document.filename,
                    annotationsToShare: []
                };

                if (localStorage.getItem('notes') !== null) {
                    var noteList = JSON.parse(angular.fromJson(localStorage.getItem('notes')));

                    if (noteList.hasOwnProperty(document.filename)) {
                        itemToShare.annotationsToShare = noteList[document.filename];
                    }
                }

                fileStorageService.shareFile(document.filepath)
                    .then(function (shareLink) {
                        itemToShare.linkToShare = 'https://' + window.location.host + '/#/apercu?title=' + encodeURIComponent(document.filename) + '&url=' + encodeURIComponent(shareLink.url);

                        UtilsService.openSocialShareModal('document', itemToShare)
                            .then(function () {
                                // Modal close
                                ToasterService.showToaster('#list-document-success-toaster', 'mail.send.ok');
                            }, function () {
                                // Modal dismiss
                            });

                    }, function (res) {
                        if (res.error === 'email_not_verified') {
                            ToasterService.showToaster('#list-document-error-toaster', 'dropbox.message.error.share.emailnotverified');
                        } else {
                            ToasterService.showToaster('#list-document-error-toaster', 'dropbox.message.error.share.ko');
                        }

                    });

                // angular-google-analytics tracking pages
                Analytics.trackPage('/document/share.html');
            }

        };


        function calculateIndex(list) {
            if (list) {
                _.each(list, function (value) {

                    if (value.showed) {
                        value.index = fileIndex;
                    }

                    fileIndex++;

                    if (value.content && value.content.length > 0 && value.contentShowed) {
                        calculateIndex(value.content);
                    }
                });
            }
        }

        $scope.toggleFolder = function (file) {
            if (file && file.type === 'folder') {
                file.contentShowed = !file.contentShowed;
                fileIndex = 0;
                calculateIndex($scope.listDocument);
            }
        };


        $scope.sortByName = function () {
            $scope.sortType = 'filename';
            $scope.sortReverse = !$scope.sortReverse;

            $scope.listDocument = sortList($scope.listDocument, $scope.sortType, $scope.sortReverse);

            calculateIndex($scope.listDocument);
        };

        $scope.sortByDate = function () {
            $scope.sortType = 'dateModification';
            $scope.sortReverse = !$scope.sortReverse;

            $scope.listDocument = sortList($scope.listDocument, $scope.sortType, $scope.sortReverse);

            calculateIndex($scope.listDocument);
        };

        function sortList(list, expression, reverse) {

            if (list && list.length > 0) {
                _.each(list, function (value) {
                    if (value.content && value.content.length > 0) {
                        value.content = sortList(value.content, expression, reverse);
                    }
                });

                return $filter('orderBy')(list, expression, reverse);
            }

        }

        /*
         * Show all the documents at the beginning
         * and creates the menu associated with the document
         */
        $scope.initialiseShowDocs = function (list) {
            if (list) {
                _.each(list, function (value) {
                    value.showed = true;
                    value.contentShowed = false;

                    if (value.type === 'folder') {
                        $scope.folderCount++;
                    } else if (value.type === 'file') {
                        $scope.documentCount++;
                    }

                    if (value.content && value.content.length > 0) {
                        $scope.initialiseShowDocs(value.content);
                    }
                });


            }
        };

        /* Filter on the name of the document to be displayed */
        $scope.specificFilter = function (list) {
            // parcours des Documents

            if (list) {
                _.each(list, function (value) {
                    value.showed = value.filename.toLowerCase().indexOf($scope.query.toLowerCase()) !== -1;

                    if (value.content && value.content.length > 0) {
                        $scope.specificFilter(value.content);
                    }
                });
            }
        };

        $scope.hasChildShowed = function (children) {
            return _.find(children, function (child) {

                if (child.type === 'folder' && child.content) {
                    return $scope.hasChildShowed(child.content);
                } else {
                    return child.showed;
                }
            });
        };

        /**
         * Search all documents
         */
        $scope.getListDocument = function () {
            LoaderService.showLoader('document.message.info.load', false);
            LoaderService.setLoaderProgress(20);

            fileStorageService.listAll().then(function (listDocument) {
                LoaderService.setLoaderProgress(100);
                LoaderService.hideLoader();

                if (listDocument) {
                    $scope.listDocument = listDocument;
                    $scope.initialiseShowDocs($scope.listDocument);

                    $scope.listDocument = sortList($scope.listDocument, $scope.sortType, $scope.sortReverse);

                    calculateIndex($scope.listDocument);
                } else {
                    $scope.listDocument = [];
                }


            }, function () {
                LoaderService.hideLoader();
            });
        };

        /**
         * Duplicate a document
         * @param document The document to be duplicate
         */
        $scope.duplicateDoc = function (document) {
            $log.debug('Duplicate a document', document);

            documentService.copyDocument(document).then(function () {

                ToasterService.showToaster('#list-document-success-toaster', 'document.message.copy.ok');
                $scope.getListDocument();
            });

        };

        $scope.createFolder = function (path) {
            $log.debug('Create a new folder', path);

            documentService.createFolder(path).then(function () {
                ToasterService.showToaster('#list-document-success-toaster', 'folder.message.create.ok');
                $scope.getListDocument();
            });

        };

        $scope.moveFile = function (file) {

            documentService.openFolderModal($scope.listDocument).then(function (result) {

                var title = 'document.message.move.confirm.title';
                var msg = 'document.message.move.confirm.message';

                if (file.type === 'folder') {
                    title = 'folder.message.move.confirm.title';
                }

                title = gettextCatalog.getString(title);
                msg = gettextCatalog.getString(msg).replace('%%FROM%%', file.filename).replace('%%TO%%', result.selectedFolder.filename);


                UtilsService.openConfirmModal(title, msg, true)
                    .then(function () {

                        var path = file.filepath.split('/');
                        var to_path = '';

                        if (path) {
                            if (result.selectedFolder.filename === '/') {
                                to_path = result.selectedFolder.filepath + path[path.length - 1];
                            } else {
                                to_path = result.selectedFolder.filepath + '/' + path[path.length - 1];
                            }
                        }

                        LoaderService.showLoader('document.message.info.move.inprogress', false);

                        fileStorageService.moveFiles(file.filepath, to_path)
                            .then(function () {
                                LoaderService.hideLoader();
                                ToasterService.showToaster('#list-document-success-toaster', 'documents.message.move.ok');
                                $scope.getListDocument();
                            }, function () {
                                LoaderService.hideLoader();
                            });

                    });


            });


        };

        $scope.createDocument = function () {

            $state.go('app.edit-document');

            
        };


    });