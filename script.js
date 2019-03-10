 // List 
 var List = (function() {
   function List() {
     this.items = []
   }

   // List prototype
   List.prototype = {
     add: function(item) {
       this.items.push(item);
     },
     remove: function(item) {
       var indexOf = this.items.indexOf(item);
       if (indexOf !== -1) {
         this.items.splice(indexOf, 1);
       }

     },
     find: function(callback, action) {
       var callbackReturn,
         items = this.items,
         length = items.length,
         matches = [],
         i = 0;

       for (; i < length; i++) {
         callbackReturn = callback(items[i], i);
         if (callbackReturn) {
           matches.push(items[i]);
         }
       }
       if (action) {
         action.call(this, matches);
       }
       return matches;
     },
     clear: function(){
        while(this.items.length > 0){
        	this.items[0].setMap(null);
         	this.items.splice(0, 1);
       }
     },
     length: function(){
     	return this.items.length;
     }
   }

   return List;

 }());

 List.create = function(params) {
   return new List(params);
 }


 //Mapper anonymous function
 var Mapper = (function() {
   //Mapper Class
   function Mapper(element, opts) {
     this.gMap = new google.maps.Map(element, opts);
     this.markers = List.create();
   }

   //Mapper prototype
   Mapper.prototype = {
     zoom: function(level) {
       if (level) {
         this.gMap.setZoom(level);
       } else {
         return this.gMap.getZoom();
       }
     },
     _on: function(opts) {
       var self = this;
       google.maps.event.addListener(opts.obj, opts.event, opts.callback, function(e) {
         opts.callback.call(self, e);
       })
     },
     addMarker: function(opts) {
       var marker;
       opts.position = {
         lat: opts.lat,
         lng: opts.lng
       }
       marker = this._createMarker(opts);

       this.markers.add(marker);
       if (opts.event) {
         this._on({
           obj: marker,
           event: opts.event.name,
           callback: opts.event.callback
         });
       }
       if (opts.content) {
         this._on({
           obj: marker,
           event: 'click',
           callback: function() {
             var infoWindow = new google.maps.InfoWindow({
               content: opts.content
             });
             infoWindow.open(this.gMap, marker);
           }
         })
       }
       return marker;
     },
     _createMarker: function(opts) {
       opts.map = this.gMap;
       return new google.maps.Marker(opts);
     },
     findBy: function(callback) {
       return this.markers.find(callback);
     },
     removeBy: function(callback) {
       this.markers.find(callback, function(markers) {
         markers.forEach(function(marker) {
           marker.setMap(null);
         })
       });
     },
     clear: function(){
     	this.markers.clear();  
     }
   };
   return Mapper;
 }());
 

var map;
var service

function initMap() {
 	// Create the map.
   var pos = { //10.315638,123.892542 provincial capitol
     lat: 10.315638,
     lng: 123.892542
   };

   var element = document.getElementById('map-canvas');
   var options = {
     center: {
       lat: pos.lat,
       lng: pos.lng
     },
     zoom: 18,
     clickable: true
   }

   map = new Mapper(element, options);
   
   var searchFields = {
       location: pos,
       radius: 500,
       types: ['restaurant']
     }
     
   var searchButton = document.getElementById('search');
 searchButton.onclick = function() {
 		map.clear();
 		search(searchFields);
 };
 
    var clearButton = document.getElementById('clear');
 clearButton.onclick = function() {
 		map.clear();
 };
 
   map.gMap.addListener('click', function() {
   //TODO place icon for starting point
  });
   
   }
   
function search(searchFields){
   // Create the places service.
   service = new google.maps.places.PlacesService(map.gMap);
   // start search
   
   var getNextPage = null;
   // Perform a nearby search.
   service.nearbySearch(searchFields,
     function(results, status, pagination) {
       if (status !== 'OK') return;

       createMarkers(results);
       if (!pagination.hasNextPage) {
         return;
       }
       getNextPage = pagination.hasNextPage && function() {
         pagination.nextPage();
       }       
       //checks if there's more results
       if(getNextPage) getNextPage();
       
  var delay = setInterval(timer, 3000);
  function timer() {}
     });
 }

 function createMarkers(places) {
   for (var i = 0, place; place = places[i]; i++) {
     var image = {
       url: place.icon,
       size: new google.maps.Size(71, 71),
       origin: new google.maps.Point(0, 0),
       anchor: new google.maps.Point(17, 34),
       scaledSize: new google.maps.Size(25, 25)       
     };

     map.addMarker({
       map: map,
       icon: image,
       title: place.name,
       position: place.geometry.location,
       lat: place.geometry.location.lat(),
       lng: place.geometry.location.lng(),
       content: place.name,
     });
   }
 }
