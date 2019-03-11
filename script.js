var map;
var service, infoWindow;
var currentMarker;
var directionsDisplay;
var directionsService;

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
    clear: function() {
      while (this.items.length > 0) {
        this.items[0].setMap(null);
        this.items.splice(0, 1);
      }
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
            infoWindow.setContent('<p>' + opts.content + '</p>');
            infoWindow.open(this.gMap, marker);
            getDirection(opts.position);
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
    clear: function() {
      this.markers.clear();
    }
  };
  return Mapper;
}());


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

  $("#search").click(function() {
    map.clear();
    search(searchFields);
  });

  $("#clear").click(function() {
    map.clear();
  });

  $("#current-loc").click(function() {

    getCurrentLocation();
  });
}

function getCurrentLocation() {

  infoWindow = new google.maps.InfoWindow();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      var opts = {
        map: map.gMap,
        title: "Current Location",
        position: pos,
        lat: pos.lat,
        lng: pos.lng,
      };
      opts.title = pos.lat + " , " + pos.lng;
      opts.content = opts.title;

      infoWindow.setPosition(pos);
      infoWindow.setContent('<div><strong>Current location</strong></div>' + opts.content);
      infoWindow.open(map.gMap);
      map.gMap.setCenter(pos);
      //place current Location Marker
      if (!currentMarker) {
        currentMarker = new google.maps.Marker(opts);
      } else {
        currentMarker.setMap(null);
        currentMarker = new google.maps.Marker(opts);
      }
    }, function() {
      handleLocationError(true, infoWindow, map.gMap.getCenter());
    });
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, map.gMap.getCenter());
  }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ?
    'Error: The Geolocation service failed.' :
    'Error: Your browser doesn\'t support geolocation.');
  infoWindow.open(map.gMap);

}

function search(searchFields) {
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
      if (getNextPage) getNextPage();

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

// direction
function getDirection(target) {
  directionsDisplay = new google.maps.DirectionsRenderer;
  directionsService = new google.maps.DirectionsService;

  directionsDisplay.setMap(map.gMap);
  directionsDisplay.setPanel(document.getElementById('right-panel'));
  var control = document.getElementById('floating-panel');
  //control.style.display = 'block';

  map.gMap.controls[google.maps.ControlPosition.TOP_CENTER].push(control);

  calculateAndDisplayRoute(directionsService, directionsDisplay, target);
}

function calculateAndDisplayRoute(directionsService, directionsDisplay, target) {
  var start = currentMarker.position;
  var end = target;
  directionsService.route({
    origin: start,
    destination: end,
    travelMode: 'DRIVING'
  }, function(response, status) {
    if (status === 'OK') {
      directionsDisplay.setDirections(response);
    } else {
      window.alert('Directions request failed due to ' + status);
    }
  });
}
