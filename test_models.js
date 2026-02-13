try {
    console.log('Loading User...');
    require('./models/User');
    console.log('User loaded');

    console.log('Loading Helper...');
    require('./models/Helper');
    console.log('Helper loaded');

    console.log('Loading Service...');
    require('./models/Service');
    console.log('Service loaded');

    console.log('Loading Booking...');
    require('./models/Booking');
    console.log('Booking loaded');
} catch (e) {
    console.error('Error loading models:', e);
}
