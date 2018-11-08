import idb from 'idb';

const dbPromise = {
  // creation and updating of database happens here.
  db: idb.open('restaurant-reviews-db', 3, function (upgradeDb) {
    switch (upgradeDb.oldVersion) {
      case 0:
        upgradeDb.createObjectStore('restaurants', { keyPath: 'id' });
      case 1:
        upgradeDb.createObjectStore('reviews', { keyPath: 'id' })
          .createIndex('restaurant_id', 'restaurant_id');
	  case 2:
        upgradeDb.createObjectStore('offline',{ autoIncrement: true });
        /*    upgradeDb.createObjectStore('offline', { keyPath: 'id' })
          .createIndex('restaurant_id', 'restaurant_id');
		*/
	}
  }),

  /**
   * Save a restaurant or array of restaurants into idb, using promises.
   */
  putRestaurants(restaurants, forceUpdate = false) {
    if (!restaurants.push) restaurants = [restaurants];
    return this.db.then(db => {
      const store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
      Promise.all(restaurants.map(networkRestaurant => {
        return store.get(networkRestaurant.id).then(idbRestaurant => {
          // if forceUpdate is true it will be updated.. 
		  if (forceUpdate) return store.put(networkRestaurant);
          if (!idbRestaurant || new Date(networkRestaurant.updatedAt) > new Date(idbRestaurant.updatedAt)) { 
		    return store.put(networkRestaurant);  
          } 
        });
      })).then(function () {
        return store.complete;
      });
    });
  },

  /**
   * Get a restaurant, by its id, or all stored restaurants in idb using promises.
   * If no argument is passed, all restaurants will returned.
   */
   // default undefined
  getRestaurants(id = undefined) {
     // this.db is database we creted
	return this.db.then(db => {
      //open a store transaction for restaurant as default readonly
	  const store = db.transaction('restaurants').objectStore('restaurants');
      // if id passed to restaurant then return restaurant by id
	  // if nothing is passed then return all restaurants
	  if (id) return store.get(Number(id));
      return store.getAll();
    });
  },
  
  // Putting reviws or list of reviews into IndexedDB database..
   
  putReviews(reviews) {
    if (!reviews.push) reviews = [reviews];
    return this.db.then(db => {
      const store = db.transaction('reviews', 'readwrite').objectStore('reviews');
      Promise.all(reviews.map(networkReview => {
        return store.get(networkReview.id).then(idbReview => {
           if (!idbReview || new Date(networkReview.updatedAt) > new Date(idbReview.updatedAt)) {
            return store.put(networkReview);  
          } 
        });
      })).then(function () {
        return store.complete;
      });
    });
  },

  // Accessing reviews from indexedDB database
  
   getReviewsForRestaurant(id) {
    return this.db.then(db => {
      const storeIndex = db.transaction('reviews').objectStore('reviews').index('restaurant_id');
      return storeIndex.getAll(Number(id));
    });
  },

   
   
   setReturnId(store,val) {
    return this.db.then(db => {
      const tx = db.transaction(store, 'readwrite');
      const pk = tx.objectStore(store).put(val);
      tx.complete;
      return pk;
    });
  }

     

};


export default dbPromise;

