import DBHelper from './dbhelper';
import './register-sw';
import favoriteButton from './favorite-button';
import reviewForm from './review-form';
let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
});

/**
 * Initialize leaflet map
 */
const initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
            if (navigator.onLine) {
        try {
          newMap = L.map('map', {
            center: [restaurant.latlng.lat, restaurant.latlng.lng],
            zoom: 16,
            scrollWheelZoom: false
          });
          L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
            mapboxToken: 'pk.eyJ1IjoidmlrYXNzYW5nd2FuMDAzIiwiYSI6ImNqbXo5eW5hYTFxaWYzcG4xYWVoMzdrY3gifQ.ErXxinHxl5gWSAh9A5u93w',
            maxZoom: 18,
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
              '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
              'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            id: 'mapbox.streets'    
          }).addTo(newMap);
          DBHelper.mapMarkerForRestaurant(self.restaurant, newMap);
        } catch(error) {
          console.log("Map couldn't be initialized", error);
		   // If an error occurred while trying to initialize the map, set map as offline
          DBHelper.mapOffline();
        }
	} else {
        //  If app detects we're offline, set map as offline
        DBHelper.mapOffline();
      
      }
      fillBreadcrumb();
    }
  });
}
	  
  
 
/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt=`Picture of ${restaurant.name}`;
  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  
  //adding favourite button-container
  const favButtonContainer = document.getElementById('fav-button-container');
  favButtonContainer.append( favoriteButton(restaurant) );
  
  

  
  
  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
   DBHelper.fetchReviewsByRestaurantId(restaurant.id)
    .then(fillReviewsHTML);
	
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    
  }
  else{
      const ul = document.getElementById('reviews-list');
       reviews.forEach(review => {
        ul.appendChild(createReviewHTML(review));
        });
       container.appendChild(ul);
   }
  const h3 = document.createElement('h3');
  h3.innerHTML = "Leave a Review";
  container.appendChild(h3);
  const id = getParameterByName('id');
  container.appendChild(reviewForm(id));
}     
/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  //date.innerHTML = review.date;
  date.innerHTML = new Date(review.createdAt).toLocaleDateString();
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  console.log("url is ::::::::::::::",url);
 name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}









window.addEventListener('load', function () {
 /* const isOffline = getParameterByName('isOffline');
  console.log("vikas u r",isOffline);
  if (isOffline) {
    document.querySelector('#offline').setAttribute('aria-hidden', false);
    document.querySelector('#offline').setAttribute('aria-live', 'assertive');
    document.querySelector('#offline').classList.add('show');
    console.log("showwwwwwwwwwwwwwwwwwwwwwwww");
    wait(8000).then(() => {
      document.querySelector('#offline').setAttribute('aria-hidden', true);
      document.querySelector('#offline').setAttribute('aria-live', 'off');
      document.querySelector('#offline').classList.remove('show');
        console.log("hidddennnnnnnnnnnnnn");    
       let urll=window.location.href;
	   let urlll=urll.replace(/([&\?]isOffline=true*$|isOffline=true&|[?&]isOffline=true(?=#))/, '');
	   window.location.href=urlll;
	});
  }

  function wait(ms) {
    return new Promise(function (resolve, reject) {
      window.setTimeout(function () {
        resolve(ms);
        reject(ms);
      }, ms);
  })}
  
  */
  
  
  DBHelper.processQueue();
});

