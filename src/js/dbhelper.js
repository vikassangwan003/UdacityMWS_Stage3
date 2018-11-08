import dbPromise from './dbpromise';
/**
 * Common database helper functions.
 */
export default class DBHelper {

  /*
   Database URL.
    Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 8000 // Change this to your server port
    return `http://localhost:${port}/data/restaurants.json`;
  }
   static get API_URL() {
    const port = 1337; // port where sails server will listen.
    return `http://localhost:${port}`;
  }
  /*
    Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', `${DBHelper.API_URL}/restaurants`);
	xhr.onload = () => {
      if (xhr.status === 200) { // Got a success response from server!
        const restaurants = JSON.parse(xhr.responseText);
        dbPromise.putRestaurants(restaurants);
		callback(null, restaurants);
	  } else { // Got an eerror from server
        console.log(`Request failed. Returned status of ${xhr.status}, trying idb...`);
        // will try IDB if we got no successfull response from server
        dbPromise.getRestaurants().then(idbRestaurants => {
          
          if (idbRestaurants.length > 0) {
            callback(null, idbRestaurants)
          } else { // if there is no restaurant
            callback('No restaurants found in idb', null);
          }
        });
      }
    };
	 // XHR needs error handling for when server is down (doesn't respond or sends back codes)
    xhr.onerror = () => {
      console.log('Error in server while trying XHR, trying idb...');
      // try idb, and if we get restaurants back, return them, otherwise return an error
      dbPromise.getRestaurants().then(idbRestaurants => {
        if (idbRestaurants.length > 0) {
          callback(null, idbRestaurants)
        } else {
          callback('IDB contains no restaurants', null);
        }
      });
    }
    xhr.send();
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
     fetch(`${DBHelper.API_URL}/restaurants/${id}`).then(response => {
      if (!response.ok) return Promise.reject("Restaurant couldn't be fetched from network");
      return response.json();
    }).then(fetchedRestaurant => {
      // if restaurant could be fetched from network:
       dbPromise.putRestaurants(fetchedRestaurant);
	  return callback(null, fetchedRestaurant);
    }).catch(networkError => {
      // if restaurant couldn't be fetched from network:
       console.log(`${networkError}, trying idb.`);
      dbPromise.getRestaurants(id).then(idbRestaurant => {
        if (!idbRestaurant) return callback("Restaurant not found in idb either", null);
        return callback(null, idbRestaurant);
      });
    });
  }
  
  
    static fetchReviewsByRestaurantId(restaurant_id) {
    return fetch(`${DBHelper.API_URL}/reviews/?restaurant_id=${restaurant_id}`).then(response => {
      if (!response.ok) return Promise.reject("Reviews couldn't be fetched from network");
      return response.json();
    }).then(fetchedReviews => {
      // if reviews could be fetched from network:
      //  storing  reviews on idb database
      dbPromise.putReviews(fetchedReviews);
      return fetchedReviews;
    }).catch(networkError => {
      // if reviews couldn't be fetched from network:
      // try to get reviews from idb as there is network failure 
      console.log(`${networkError}, trying idb.`);
      return dbPromise.getReviewsForRestaurant(restaurant_id).then(idbReviews => {
        //  if reviews are not present on IDB then return NULL
        if (idbReviews.length < 1) return null;
        return idbReviews;
      });
    });
  }
   
   // for storing Offline reviews to IDB   
   static createIDBReview(review) {
   return dbPromise.setReturnId('offline',review)
    .then(id => {
      console.log('Saved to IDB: reviews', review);
      return id;
    });
   }
  
  
   
   
   
 // for offline reviews  
   
     static processQueue() {
  // Open offline queue & return cursor
      dbPromise.db.then(db => {
          if (!db) return;
          const tx = db.transaction(['offline'], 'readwrite');
          const store = tx.objectStore('offline');
         return store.openCursor();
       })
      .then(function nextRequest (cursor) {
         if (!cursor) {
            console.log('cursor done.');
           return;
          }
        console.log('cursor', cursor.value);

        const offline_key = cursor.key;
        const url = `${DBHelper.API_URL}/reviews`;
        //const headers = { 'Content-Type': 'application/form-data' };
        const method = 'POST';
        const data1 = cursor.value;
        //const review_key = cursor.value.review_key;
        const body = JSON.stringify(data1);
        console.log("vvvvvvvvvvvvvvviiiiiiiiiiii__Offffffffff",body);
      // update server with HTTP POST request & get updated record back        
        fetch(url, {
          
          method: method,
          body: body
        })
        .then(response => response.json())
        .then(data1 => {
          // data is returned record
          console.log('Received updated record from DB Server', data1);
          // test if this is a review or favorite update

          // 1. Delete http request record from offline store
          dbPromise.db.then(db => {
            const tx = db.transaction(['offline'], 'readwrite');
            tx.objectStore('offline').delete(offline_key);
            return tx.complete;
          })
            .then(() => {
              // 2. Add new review record to reviews store
              // 3. Delete old review record from reviews store 
              dbPromise.db.then(db => {
                const tx = db.transaction(['reviews'], 'readwrite');
                return tx.objectStore('reviews').put(data)
                  .then(() => tx.objectStore('reviews').delete(review_key))
                  .then(() => {
                    console.log('tx complete reached.');
                    return tx.complete;
                  })
                  .catch(err => {
                    tx.abort();
                    console.log('there is some transaction error: tx aborted', err);
                  });
              })
                .then(() => console.log('review transaction successfull!'))
                .catch(err => console.log('reviews store error', err));
            })
            .then(() => console.log('offline record delete success!'))
            .catch(err => console.log('offline store error', err));
        }).catch(err => {
          console.log('fetch error. we are offline.');
          console.log(err);
          return;
        });
      return cursor.continue().then(nextRequest);
    })
    .then(() => console.log('Done cursoring'))
    .catch(err => console.log('Error opening cursor', err));
} 
  
  
  
  
  
  
  
  
  

  
  
  
  
  
  
  
  
  
  
  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/images/${(restaurant.photograph||restaurant.id)}.jpg`);
	
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(map);
    return marker;
  } 
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

  
  // to show a messagage that reviws will be shown when connection will reestablish
  	 static showOffline(){
             document.querySelector('#offline').setAttribute('aria-hidden', false);
             document.querySelector('#offline').setAttribute('aria-live', 'assertive');
             document.querySelector('#offline').classList.add('show');

             wait(8000).then(() => {
              document.querySelector('#offline').setAttribute('aria-hidden', true);
              document.querySelector('#offline').setAttribute('aria-live', 'off');
              document.querySelector('#offline').classList.remove('show');
             });
           
       
               function wait(ms) {
                      return new Promise(function (resolve, reject) {
                     window.setTimeout(function () {
                     resolve(ms);
                     reject(ms);
                    }, ms);
               })}
	   }
	   
	   
   
    
	
	
	static addRequestToQueue(url,method) {
    const request = {
       url: url,
       
       method: method,
       
       
       };
        return dbPromise.setReturnId('offline', request)
         .then(id => {
          console.log('Saved to IDB: offline', request);
          return id;
      });
     }
   
   
   
   
  
  static mapOffline() {
    const map = document.getElementById('map');
    map.className = "map-offline";
    map.innerHTML = `<div class="warning-icon">!</div>
    <div class="warning-message">We're having problems loading Maps</div>
    <div class="warning-suggestion">Are you offline? If you need to see a map, please check back later.</div>`;
  }
}  
// export default DBHelper;