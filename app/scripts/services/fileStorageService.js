/*File: fileStorageService.js
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

var cnedApp = cnedApp;

cnedApp.service('fileStorageService', function ($localForage, configuration, $q, $log,
                                                CacheProvider, DropboxProvider, UserService, $rootScope, GoogleDriveProvider, OneDriveProvider, FileConstant) {

    var self = this;

    /** ************** Document management (offline/online) ******************* */

    /**
     *
     * Search files on Dropbox, updates the cache
     * if the files have been found. Returns a list of files from the cache
     * @param online
     *            if there is internet access
     * @param token
     *            the dropbox token
     * @method list
     */
    this.list = function (type) {
        $log.debug('fileStorageService - list ', UserService.getData());

        var query = '';
        var storageName = '';

        if (type === 'document') {
            query = FileConstant.DROPBOX.query.document;
            storageName = 'listDocument';
        } else if (type === 'profile') {
            query = FileConstant.DROPBOX.query.profile;
            storageName = 'listProfile';
        }

        if ($rootScope.isAppOnline && UserService.getData() && UserService.getData().provider) {

            var provider = UserService.getData().provider;

            if (provider === 'dropbox') {
                return DropboxProvider.search(query, UserService.getData().token, type).then(function (files) {
                    return CacheProvider.saveAll(files, storageName);
                }, function () {
                    return CacheProvider.list(storageName);
                });
            } else if (provider === 'google-drive') {

                query = "mimeType = '" + FileConstant.MIME_TYPE[type] + "'";

                return GoogleDriveProvider.search(query, UserService.getData().token, type).then(function (files) {
                    return CacheProvider.saveAll(files, storageName);
                }, function () {
                    return CacheProvider.list(storageName);
                });

            } else if (provider === 'one-drive') {

                return OneDriveProvider.search(FileConstant.ONE_DRIVE.query[type], UserService.getData().token, type).then(function (files) {
                    return CacheProvider.saveAll(files, storageName);
                }, function () {
                    return CacheProvider.list(storageName);
                });

            } else {
                // Resolve Cache
                return CacheProvider.list(storageName);
            }

        } else {
            // Resolve Cache
            return CacheProvider.list(storageName);
        }

    };

    this.listAll = function (forceCache) {

        var storageName = 'listDocument';
        var type = 'document';
        var path = '';

        if ($rootScope.isAppOnline && UserService.getData() && UserService.getData().provider && !forceCache) {

            var provider = UserService.getData().provider;
            var query = '';

            if (provider === 'dropbox') {

                return DropboxProvider.listAllFiles(path, UserService.getData().token).then(function (files) {
                    return CacheProvider.saveAll(files, storageName);
                }, function () {
                    return CacheProvider.list(storageName);
                });
            } else if (provider === 'google-drive') {

                query = "mimeType = '" + FileConstant.MIME_TYPE.document + "' or mimeType = '" + FileConstant.MIME_TYPE.folder + "'";

                return GoogleDriveProvider.search(query, UserService.getData().token, type).then(function (files) {
                    return CacheProvider.saveAll(files, storageName);
                }, function () {
                    return CacheProvider.list(storageName);
                });

            } else if (provider === 'one-drive') {

                return OneDriveProvider.search(FileConstant.ONE_DRIVE.query.filesAndFolders, UserService.getData().token, type)
                    .then(function (files) {
                        return CacheProvider.saveAll(files, storageName);
                    }, function () {
                        return CacheProvider.list(storageName);
                    });

            }
        } else {
            // Resolve Cache
            return CacheProvider.list(storageName);
        }
    };

    /**
     * Search files in Dropbox or in the cache if dropbox is not accessible
     * @param filename
     * @param type
     * @returns {*}
     */
    this.get = function (filename, type) {

        var storageName = '';

        if (type === 'document') {
            storageName = 'listDocument';
        } else if (type === 'profile') {
            storageName = 'listProfile';
        }

        if ($rootScope.isAppOnline && UserService.getData() && UserService.getData().provider) {

            var provider = UserService.getData().provider;


            if (provider === 'dropbox') {

                return DropboxProvider.search('_' + filename + '_', UserService.getData().token, type).then(function (files) {


                    if (files && files.length > 0) {
                        for (var i = 0; i < files.length; i++) {
                            if (files[i].filename === filename) {
                                return DropboxProvider.download(files[i].filepath, UserService.getData().token).then(function (fileContent) {
                                    files[i].data = fileContent;

                                    return CacheProvider.save(files[i], storageName);
                                });
                            }
                        }
                    } else {
                        return CacheProvider.get(filename, storageName);
                    }

                }, function () {
                    return CacheProvider.get(filename, storageName);
                });

            } else if (provider === 'google-drive') {

                return GoogleDriveProvider.search("name contains '" + filename + "'", UserService.getData().token, type)
                    .then(function (files) {


                        if (files && files.length > 0) {
                            for (var i = 0; i < files.length; i++) {
                                if (files[i].filename === filename) {
                                    return GoogleDriveProvider.download(files[i].id, UserService.getData().token)
                                        .then(function (fileContent) {
                                            files[i].data = fileContent;

                                            return CacheProvider.save(files[i], storageName);
                                        });
                                }
                            }
                        } else {
                            return CacheProvider.get(filename, storageName);
                        }

                    }, function () {
                        return CacheProvider.get(filename, storageName);
                    });
            } else if (provider === 'one-drive') {
                return OneDriveProvider.search(filename + FileConstant.ONE_DRIVE.query[type], UserService.getData().token, type)
                    .then(function (files) {

                        if (files && files.length > 0) {
                            for (var i = 0; i < files.length; i++) {
                                if (files[i].filename === filename) {
                                    return OneDriveProvider.download(files[i], type, UserService.getData().token)
                                        .then(function (fileContent) {
                                            files[i].data = fileContent;

                                            return CacheProvider.save(files[i], storageName);
                                        });
                                }
                            }
                        } else {
                            return CacheProvider.get(filename, storageName);
                        }

                    }, function () {
                        return CacheProvider.get(filename, storageName);
                    });
            }
        } else {
            return CacheProvider.get(filename, storageName);
        }
    };

    /**
     * Search files in Dropbox or in the cache if dropbox is not accessible
     *
     * @param online
     *           if there is internet access
     * @param query
     *            the search query
     * @param token
     *            the dropbox token
     * @method get
     */
    this.getData = function (file, type) {

        var storageName = '';

        if (type === 'document') {
            storageName = 'listDocument';
        } else if (type === 'profile') {
            storageName = 'listProfile';
        }

        if ($rootScope.isAppOnline && UserService.getData() && UserService.getData().provider) {

            var provider = UserService.getData().provider;

            if (provider === 'dropbox') {
                return DropboxProvider.download(file.filepath, UserService.getData().token)
                    .then(function (fileContent) {
                        file.data = fileContent;

                        return CacheProvider.save(file, storageName).then(function (fileSaved) {
                            return fileSaved;
                        });
                    }, function () {
                        return CacheProvider.get(file.filename, storageName).then(function (fileFound) {
                            return fileFound;
                        });
                    });
            } else if (provider === 'google-drive') {

                return GoogleDriveProvider.download(file.id, UserService.getData().token)
                    .then(function (fileContent) {
                        file.data = fileContent;

                        return CacheProvider.save(file, storageName).then(function (fileSaved) {
                            return fileSaved;
                        });
                    }, function () {
                        return CacheProvider.get(file.filename, storageName).then(function (fileFound) {
                            return fileFound;
                        });
                    });
            } else if (provider === 'one-drive') {
                return OneDriveProvider.download(file, type, UserService.getData().token)
                    .then(function (fileContent) {
                        file.data = fileContent;

                        return CacheProvider.save(file, storageName).then(function (fileSaved) {
                            return fileSaved;
                        });
                    }, function () {
                        return CacheProvider.get(file.filename, storageName).then(function (fileFound) {
                            return fileFound;
                        });
                    });
            }

        } else {
            return CacheProvider.get(file.filename, storageName).then(function (fileFound) {

                $log.debug('FileStorageService - GetData file found', fileFound);
                return fileFound;
            });
        }
    };

    this.save = function (file, type) {

        var storageName = '';
        var extension = '';

        if (type === 'document') {
            storageName = 'listDocument';
            extension = '.html';
        } else if (type === 'profile') {
            storageName = 'listProfile';
            extension = '.json';
        }


        if ($rootScope.isAppOnline && UserService.getData() && UserService.getData().provider) {

            var provider = UserService.getData().provider;

            if (provider === 'dropbox') {

                if (!file.filepath) {
                    file.filepath = DropboxProvider.generateFilepath(file.filename, extension);

                    if (type === 'document' && file.folder) {
                        file.filepath = file.folder.filepath + file.filepath;
                    }
                }

                return DropboxProvider.upload(file.filepath, file.data, UserService.getData().token)
                    .then(function (_file) {
                        _file.data = file.data;
                        return CacheProvider.save(_file, storageName);
                    }, function () {
                        self.addFileToSynchronize(file, type, 'save');
                        return CacheProvider.save(file, storageName);
                    });
            } else if (provider === 'google-drive') {

                return GoogleDriveProvider.upload(file, type, UserService.getData().token)
                    .then(function (_file) {
                        _file.data = file.data;
                        return CacheProvider.save(_file, storageName);
                    }, function () {
                        self.addFileToSynchronize(file, type, 'save');
                        return CacheProvider.save(file, storageName);
                    });
            } else if (provider === 'one-drive') {


                return OneDriveProvider.upload(file, FileConstant.ONE_DRIVE.query[type], UserService.getData().token)
                    .then(function (_file) {
                        _file.data = file.data;
                        return CacheProvider.save(_file, storageName);
                    }, function () {
                        self.addFileToSynchronize(file, type, 'save');
                        return CacheProvider.save(file, storageName);
                    });
            }

        } else {
            file.id = -1;

            self.addFileToSynchronize(file, type, 'save');
            return CacheProvider.save(file, storageName);
        }
    };


    /**
     * Renames the file on Dropbox and if possible in the cache.
     * @param online
     *            if there is internet access
     * @param oldFilename
     *            the old file name.
     * @param newFilename
     *            the new file name.
     * @param le
     *           the dropbox token
     * @method renameFile
     */
    this.rename = function (file, newName, type) {
        var storageName = '';
        var extension = '';

        if (type === 'document') {
            storageName = 'listDocument';
            extension = '.html';
        } else if (type === 'profile') {
            storageName = 'listProfile';
            extension = '-profile.json';
        }


        if ($rootScope.isAppOnline && UserService.getData() && UserService.getData().provider) {


            var provider = UserService.getData().provider;

            if (provider === 'dropbox') {

                $log.debug('Rename dropbox file', file);


                var basePath = file.filepath.substring(0, file.filepath.lastIndexOf('/'));

                $log.debug('Rename dropbox basePath', basePath);

                var newFilePath = basePath + DropboxProvider.generateFilepath(newName, extension);

                return DropboxProvider.rename(file.filepath, newFilePath, UserService.getData().token).then(function (data) {
                    return CacheProvider.delete(file, storageName).then(function () {
                        return CacheProvider.save(data, storageName);
                    });
                }, function () {
                    self.addFileToSynchronize(file, type, 'delete');
                    return CacheProvider.delete(file, storageName).then(function () {
                        file.filename = newName;
                        file.filepath = newFilePath;
                        self.addFileToSynchronize(file, type, 'save');
                        return CacheProvider.save(file, storageName);
                    });
                });
            } else if (provider === 'google-drive') {
                return GoogleDriveProvider.patch(file, {
                    name: newName
                }, null, UserService.getData().token)
                    .then(function (data) {
                        return CacheProvider.delete(file, storageName).then(function () {
                            return CacheProvider.save(data, storageName);
                        });
                    }, function () {
                        self.addFileToSynchronize(file, type, 'delete');
                        return CacheProvider.delete(file, storageName)
                            .then(function () {
                                file.filename = newName;
                                self.addFileToSynchronize(file, type, 'save');
                                return CacheProvider.save(file, storageName);
                            });
                    });
            } else if (provider === 'one-drive') {
                return OneDriveProvider.rename(file, newName, type, UserService.getData().token)
                    .then(function (data) {
                        return CacheProvider.delete(file, storageName).then(function () {
                            return CacheProvider.save(data, storageName);
                        });
                    }, function () {
                        self.addFileToSynchronize(file, type, 'delete');
                        return CacheProvider.delete(file, storageName)
                            .then(function () {
                                file.filename = newName;
                                self.addFileToSynchronize(file, type, 'save');
                                return CacheProvider.save(file, storageName);
                            });
                    });
            }

        } else {
            self.addFileToSynchronize(file, type, 'delete');

            $log.debug('Rename - addFileToSynchronize', file);

            return CacheProvider.delete(file, storageName).then(function () {

                var parent = null;

                if (file.parent && file.parent.filename) {
                    return CacheProvider.get(file.parent.filename, storageName)
                        .then(function (folder) {
                            parent = folder;

                            if (!parent.content) {
                                parent.content = [];
                            }

                            file.filename = newName;
                            file.filepath = newFilePath;

                            parent.content.push(file);

                            $log.debug('Rename - addFileToSynchronize', file);
                            self.addFileToSynchronize(file, type, 'save');
                            return CacheProvider.save(parent, storageName);

                        });
                } else {

                    file.filename = newName;
                    file.filepath = newFilePath;

                    $log.debug('Rename - addFileToSynchronize', file);
                    self.addFileToSynchronize(file, type, 'save');
                    return CacheProvider.save(file, storageName);

                }

            });


        }
    };

    /**
     * Renames the file on Dropbox and if possible in the cache.
     * @param online
     *            if there is internet access
     * @param oldFilename
     *            the old file name.
     * @param newFilename
     *            the new file name.
     * @param le
     *           the dropbox token
     * @method renameFile
     */
    this.renameFolder = function (folder, newName) {
        var storageName = 'listDocument';
        var type = 'document';

        if ($rootScope.isAppOnline && UserService.getData() && UserService.getData().provider) {

            var provider = UserService.getData().provider;

            if (provider === 'dropbox') {
                var newPath = folder.filepath.substring(0, folder.filepath.lastIndexOf('/')) + '/' + newName;

                $log.debug('RenameFolder newpath', newPath);

                return DropboxProvider.moveFiles(folder.filepath, newPath, UserService.getData().token);

            } else if (provider === 'google-drive') {

                return GoogleDriveProvider.patch(folder, {
                    name: newName
                }, null, UserService.getData().token)
                    .then(function (data) {
                        return CacheProvider.delete(folder, storageName).then(function () {
                            return CacheProvider.save(data, storageName);
                        });
                    }, function () {
                        self.addFileToSynchronize(folder, '', 'delete');
                        return CacheProvider.delete(folder, storageName)
                            .then(function () {
                                file.filename = newName;
                                file.filepath = newName;
                                self.addFileToSynchronize(folder, type, 'save');
                                return CacheProvider.save(folder, storageName);
                            });
                    });
            } else if (provider === 'one-drive') {
                return OneDriveProvider.rename(folder, newName, null, UserService.getData().token)
                    .then(function (data) {
                        return CacheProvider.delete(folder, storageName).then(function () {
                            return CacheProvider.save(data, storageName);
                        });
                    }, function () {
                        self.addFileToSynchronize(folder, type, 'delete');
                        return CacheProvider.delete(folder, storageName)
                            .then(function () {
                                folder.filename = newName;
                                self.addFileToSynchronize(folder, type, 'save');
                                return CacheProvider.save(folder, storageName);
                            });
                    });
            }
        }
    };

    /**
     * Delete the file on Dropbox and if possible in the cache.
     *
     * @param online
     *            if there is internet access
     * @param filename
     *            the name of the file
     * @param le
     *           the dropbox token
     * @method deleteFile
     */
    this.delete = function (file, type) {

        var storageName = '';

        if (type === 'document') {
            storageName = 'listDocument';
        } else if (type === 'profile') {
            storageName = 'listProfile';
        }

        if ($rootScope.isAppOnline && UserService.getData() && UserService.getData().provider) {
            var provider = UserService.getData().provider;

            if (provider === 'dropbox') {

                return DropboxProvider.delete(file.filepath, UserService.getData().token)
                    .then(function () {
                        return CacheProvider.delete(file, storageName);
                    }, function () {
                        self.addFileToSynchronize(file, type, 'delete');
                        return CacheProvider.delete(file, storageName);
                    });

            } else if (provider === 'google-drive') {

                return GoogleDriveProvider.delete(file.id, UserService.getData().token)
                    .then(function () {
                        return CacheProvider.delete(file, storageName);
                    }, function () {
                        self.addFileToSynchronize(file, type, 'delete');
                        return CacheProvider.delete(file, storageName);
                    });

            } else if (provider === 'one-drive') {

                return OneDriveProvider.delete(file, UserService.getData().token)
                    .then(function () {
                        return CacheProvider.delete(file, storageName);
                    }, function () {
                        self.addFileToSynchronize(file, type, 'delete');
                        return CacheProvider.delete(file, storageName);
                    });

            }
        } else {
            self.addFileToSynchronize(file, type, 'delete');
            return CacheProvider.delete(file, storageName);
        }

    };

    /**
     * Share the file on dropbox and returns the sharing URL.
     *
     * @method shareFile
     */
    this.shareFile = function (file) {
        var provider = UserService.getData().provider;

        if (provider === "dropbox") {
            return DropboxProvider.shareLink(file.filepath, UserService.getData().token);
        } else if (provider === "one-drive") {
            return OneDriveProvider.shareLink(file, UserService.getData().token);
        } else if (provider === "google-drive") {
            return GoogleDriveProvider.shareLink(file, UserService.getData().token);
        } else {
            return null;
        }
    };

    /**
     * Share the file on dropbox and returns the sharing URL.
     *
     * @method shareFile
     */
    this.createFolder = function (folder) {

        folder.type = 'folder';
        folder.dateModification = new Date().toISOString();
        folder.content = [];

        if ($rootScope.isAppOnline && UserService.getData() && UserService.getData().provider) {

            var provider = UserService.getData().provider;

            if (provider === 'dropbox') {
                return DropboxProvider.createFolder(folder.filepath, UserService.getData().token)
                    .then(function () {
                        return CacheProvider.save(folder, 'listDocument');
                    }, function () {
                        return CacheProvider.save(folder, 'listDocument');
                    });

            } else if (provider === 'google-drive') {
                return GoogleDriveProvider.createFolder(folder.filename, UserService.getData().token)
                    .then(function (data) {
                        return CacheProvider.save(data, 'listDocument');
                    }, function () {
                        return CacheProvider.save(folder, 'listDocument');
                    });
            } else if (provider === 'one-drive') {
                return OneDriveProvider.createFolder(folder.filepath, folder.filename, UserService.getData().token)
                    .then(function (data) {
                        return CacheProvider.save(data, 'listDocument');
                    }, function () {
                        return CacheProvider.save(folder, 'listDocument');
                    });
            }

        } else {
            return CacheProvider.save(folder, 'listDocument');
        }
    };

    /**
     * Share the file on dropbox and returns the sharing URL.
     *
     * @method shareFile
     */
    this.moveFiles = function (file, folder) {
        if (UserService.getData() && UserService.getData().token && UserService.getData().provider) {
            var provider = UserService.getData().provider;

            if (provider === 'dropbox') {

                var path = file.filepath.split('/');
                var to_path = '';

                if (path) {
                    if (folder.filepath === '/') {
                        to_path = folder.filepath + path[path.length - 1];
                    } else {
                        to_path = folder.filepath + '/' + path[path.length - 1];
                    }
                }

                return DropboxProvider.moveFiles(file.filepath, to_path, UserService.getData().token).then(function (data) {
                    return CacheProvider.delete(file, 'listDocument').then(function () {
                        file.filepath = to_path;
                        return CacheProvider.save(file, 'listDocument');
                    });
                }, function () {
                    self.addFileToSynchronize(file, 'document', 'delete');
                    return CacheProvider.delete(file, 'listDocument').then(function () {
                        file.filepath = to_path;
                        self.addFileToSynchronize(file, 'document', 'save');
                        return CacheProvider.save(file, 'listDocument');
                    });
                });
            } else if (provider === 'google-drive') {

                var params = {};


                if (folder.filepath !== '/') {
                    params.addParents = folder.id;
                    if (file.parents && file.parents.length > 0) {
                        params.removeParents = file.parents[0]
                    }
                } else {
                    if (file.parents && file.parents.length > 0) {
                        params.removeParents = file.parents[0]
                    }
                }

                return GoogleDriveProvider.patch(file, null, params, UserService.getData().token);
            } else if (provider === 'one-drive') {


                return OneDriveProvider.move(file, folder.id, UserService.getData().token);
            }
        } else {
            self.addFileToSynchronize(file, 'document', 'delete');

            $log.debug('Move file - addFileToSynchronize', file);

            return CacheProvider.delete(file, 'listDocument').then(function () {

                var parent = null;

                $log.debug('Move file - folder', folder);

                if (folder && folder.filepath !== '/') {
                    return CacheProvider.get(folder.filename, 'listDocument')
                        .then(function (parent) {

                            file.parent = {
                                filename: parent.filename
                            };

                            if (!parent.content) {
                                parent.content = [];
                            }

                            parent.content.push(file);

                            $log.debug('Move file - addFileToSynchronize', file);
                            self.addFileToSynchronize(file, 'document', 'save');
                            return CacheProvider.save(parent, 'listDocument');

                        });
                } else {
                    delete file.parent;
                    delete file.folder;
                    self.addFileToSynchronize(file, 'document', 'save');
                    return CacheProvider.save(file, 'listDocument');
                }

            });
        }
    };

    /**
     * Copy a file
     * @param originalFile
     * @param destinationFile
     * @param type
     * @returns {*}
     */
    this.copyFile = function (originalFile, destinationFile, type) {

        var storageName = '';
        var extension = '';

        if (type === 'document') {
            storageName = 'listDocument';
            extension = '.html';
        } else if (type === 'profile') {
            storageName = 'listProfile';
            extension = '-profile.json';
        }
        $log.debug('file.filepath', destinationFile.filepath);

        if ($rootScope.isAppOnline && UserService.getData() && UserService.getData().provider) {

            var provider = UserService.getData().provider;

            if (provider === 'dropbox') {

                // Generate new filepath
                destinationFile.filepath = decodeURIComponent(DropboxProvider.generateFilepath(destinationFile.filename, extension));

                return DropboxProvider.copy(originalFile.filepath, destinationFile.filepath, UserService.getData().token)
                    .then(function () {

                        $log.debug('File copied', destinationFile.filepath);

                        if (!destinationFile.data) {
                            return DropboxProvider.download(destinationFile.filepath, UserService.getData().token)
                                .then(function (fileContent) {
                                    destinationFile.data = fileContent;

                                    return CacheProvider.save(destinationFile, storageName);
                                }, function () {
                                    return CacheProvider.save(destinationFile, storageName);
                                });
                        } else {
                            return CacheProvider.save(destinationFile, storageName);
                        }
                    }, function () {
                        self.addFileToSynchronize(destinationFile, type, 'save');
                        return CacheProvider.save(destinationFile, storageName);
                    });
            } else if (provider === 'google-drive') {
                return GoogleDriveProvider.copy(originalFile, destinationFile, UserService.getData().token)
                    .then(function () {
                        if (!destinationFile.data) {
                            return GoogleDriveProvider.download(destinationFile.id, UserService.getData().token)
                                .then(function (fileContent) {
                                    destinationFile.data = fileContent;

                                    return CacheProvider.save(destinationFile, storageName);
                                }, function () {
                                    return CacheProvider.save(destinationFile, storageName);
                                });
                        } else {
                            return CacheProvider.save(destinationFile, storageName);
                        }
                    }, function () {
                        self.addFileToSynchronize(destinationFile, type, 'save');
                        return CacheProvider.save(destinationFile, storageName);
                    });
            } else if (provider === 'one-drive') {
                return OneDriveProvider.copy(originalFile, destinationFile.filename, UserService.getData().token)
                    .then(function () {
                        return CacheProvider.save(destinationFile, storageName);
                    }, function () {
                    });
            }
        } else {
            self.addFileToSynchronize(destinationFile, type, 'save');
            return CacheProvider.save(destinationFile, storageName);
        }
    };


    /** **************************** storage Management ******************** */

    /**
     * Save the contents of the file for printing.
     *
     * @param filecontent
     *            The content fo the file
     * @return a promise
     * @method saveTempFileForPrint
     */
    this.saveTempFileForPrint = function (fileContent) {
        return $localForage.setItem('printTemp', fileContent);
    };


    /**
     * Return the document to be printed.
     */
    this.getTempFileForPrint = function () {
        return $localForage.getItem('printTemp');
    };

    /**
     * Save the contents of the temporary file.
     * @param filecontent
     *             The content fo the file
     * @method saveTempFile
     */
    this.saveTempFile = function (filecontent) {
        return $localForage.setItem('docTemp', filecontent);
    };

    /**
     * Retrieve the contents of the temporary file
     *
     * @method getTempFile
     */
    this.getTempFile = function () {
        return $localForage.getItem('docTemp');
    };


    this.addFileToSynchronize = function (file, type, action) {

        var storageName = '';

        if (type === 'document') {
            storageName = 'documentsToSynchronize';
        } else if (type === 'profile') {
            storageName = 'profilesToSynchronize';
        }

        CacheProvider.getItem(storageName).then(function (items) {
            if (!items) {
                items = [];
            }

            var isFound = false;
            for (var i = 0; i < items.length; i++) {
                if (items[i].file.filename == file.filename) {
                    isFound = true;

                    if (items[i].action === 'save' && action === 'delete') {
                        items.splice(i, 1);
                    } else {
                        items[i] = {
                            action: action,
                            file: file
                        };
                    }

                    break;
                }
            }

            if (!isFound) {
                items.push({
                    action: action,
                    file: file
                });
            }

            $log.debug('File to synchronize', items);
            CacheProvider.setItem(items, storageName);
        });
    };

    this.isSynchronizing =  false;

    /**
     * Synchronize files in cache
     */
    this.synchronizeFiles = function () {
        var deferred = $q.defer();

        if ($rootScope.isAppOnline && UserService.getData() && UserService.getData().provider && !self.isSynchronizing) {

            self.isSynchronizing = true;


            CacheProvider.getItem('documentsToSynchronize').then(function (documents) {

                console.log('documentsToSynchronize', documents);

                CacheProvider.getItem('profilesToSynchronize').then(function (profiles) {

                    console.log('profilesToSynchronize', profiles);

                    var toSend = [];



                    // Synchronize doc
                    if (documents) {
                        for (var i = 0; i < documents.length; i++) {
                            if (documents[i].action === 'save') {
                                toSend.push(self.save(documents[i].file, 'document'));
                            } else if (documents[i].action === 'delete') {
                                toSend.push(self.delete(documents[i].file, 'document'));
                            }
                        }
                    }


                    // Synchronize profiles
                    if (profiles) {

                        for (var i = 0; i < profiles.length; i++) {
                            profiles[i].file.data.owner = UserService.getData().email;
                            if (profiles[i].action === 'save') {
                                toSend.push(self.save(profiles[i].file, 'profile'));
                            } else if (profiles[i].action === 'delete') {
                                toSend.push(self.delete(profiles[i].file, 'profile'));
                            }
                        }
                    }

                    if (toSend.length > 0) {

                        $q.all(toSend).then(function (res) {
                            $log.debug('res from documentsToSynchronize', res);
                            CacheProvider.setItem(null, 'documentsToSynchronize');
                            CacheProvider.setItem(null, 'profilesToSynchronize');

                            deferred.resolve({
                                documentCount: documents ? documents.length : 0,
                                profilesCount: profiles ? profiles.length : 0
                            });

                            self.isSynchronizing = false;

                        }, function(){
                            self.isSynchronizing = false;
                        });
                    } else {
                        deferred.resolve();
                    }

                });
            });

        } else {
            deferred.resolve();
        }


        return deferred.promise;
    };

});