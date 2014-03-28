'use strict';
/**
 *controller responsacle de tout les operation ayant rapport avec la bookmarklet
 */

angular.module('cnedApp').controller('passportContinueCtrl', function($scope, $http, $rootScope, $location, serviceCheck, dropbox, configuration) {

	$scope.guest = $rootScope.loged;
	$scope.missingDropbox = $rootScope.dropboxWarning;

	$scope.inscriptionStep2 = false; //false
	$scope.inscriptionStep3 = false; //false
	$scope.inscriptionStep4 = false; //false
	$scope.showStep2part1 = true; //true
	$scope.showStep2part2 = false; //false
	$scope.step1 = 'btn btn-default btn-circle';
	$scope.step2 = 'btn btn-primary btn-circle';
	$scope.step3 = 'btn btn-default btn-circle';
	$scope.step4 = 'btn btn-default btn-circle';


	$rootScope.$watch('loged', function() {
		$scope.guest = $rootScope.loged;
		$scope.apply; // jshint ignore:line
	});

	$scope.init = function() {


		$scope.inscriptionStep1 = false;
		$scope.inscriptionStep2 = true;
		$scope.inscriptionStep3 = false;
		$scope.showStep2part2 = false;
		$scope.step2 = 'btn btn-primary btn-circle';
		$scope.step1 = 'btn btn-default btn-circle';
		var tmp = serviceCheck.getData();
		tmp.then(function(result) { // this is only run after $http completes
			if (result.loged) {
				if (result.dropboxWarning === false) {
					$rootScope.dropboxWarning = false;
					$scope.missingDropbox = false;
					$rootScope.loged = true;
					$rootScope.admin = result.admin;
					$('#myModal').modal('show');
					$rootScope.apply; // jshint ignore:line
					if ($location.path() !== '/inscriptionContinue') {
						$location.path('/inscriptionContinue');
					}
				} else {
					$rootScope.dropboxWarning = true;
					$rootScope.loged = true;
					$rootScope.admin = result.admin;
					$scope.showStep2part1 = false; //true
					$scope.showStep2part2 = true; //false
					$rootScope.apply; // jshint ignore:line

					var tmp = dropbox.search('.html', localStorage.getItem('compte'), 'sandbox');
					tmp.then(function(data) {
						$scope.listDocument = data;
						$http.get(configuration.URL_REQUEST + '/listDocument.appcache').then(function(dataIndexPage) {
							var tmp = dropbox.upload('listDocument.appcache', dataIndexPage.data, localStorage.getItem('compte'), 'sandbox');
							tmp.then(function() { // this is only run after $http completes
								console.log('manifest uploaded');
								var tmp2 = dropbox.shareLink('listDocument.appcache', localStorage.getItem('compte'), 'sandbox');
								tmp2.then(function(result) {
									$scope.manifestLink = result.url;
									$http.get(configuration.URL_REQUEST + '/index.html').then(function(dataIndexPage) {
										dataIndexPage.data = dataIndexPage.data.replace('var listDocument=[]', 'var listDocument= ' + angular.toJson($scope.listDocument));
										dataIndexPage.data = dataIndexPage.data.replace('manifest=""', 'manifest=" ' + $scope.manifestLink + '"');
										var tmp = dropbox.upload('test.html', dataIndexPage.data, localStorage.getItem('compte'), 'sandbox');
										tmp.then(function(result) { // this is only run after $http completes
											console.log(result);
										});
									});
								});
							});
						});
					});
				}
			} else {
				if ($location.path() !== '/') {
					$location.path('/');
				}
			}
		});
	};

	$scope.toStep3 = function() {

		$scope.step3 = 'btn btn-primary btn-circle';
		$scope.step2 = 'btn btn-default btn-circle';
		$scope.showlogin = false;
		$scope.inscriptionStep1 = false;
		$scope.inscriptionStep2 = false;
		$scope.inscriptionStep3 = true;
	};

	$scope.toStep4 = function() {

		$scope.showlogin = false;
		$scope.inscriptionStep1 = false;
		$scope.inscriptionStep2 = false;
		$scope.inscriptionStep3 = false;
		$scope.inscriptionStep4 = true;
		$scope.step4 = 'btn btn-primary btn-circle';
		$scope.step3 = 'btn btn-default btn-circle';
	};

});