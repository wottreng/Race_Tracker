describe('tracker frontend test', () => {
    beforeEach(() => {
        // Define the geolocation object with all necessary methods
        const geolocation = {
            getCurrentPosition: (success) => {
                success({
                    coords: {
                        latitude: 37.7749,
                        longitude: -122.4194,
                        accuracy: 10,
                        altitude: 100,
                        altitudeAccuracy: 5,
                        heading: 90,
                        speed: 25
                    },
                    timestamp: Date.now()
                });
            },
            watchPosition: (success) => {
                const watchId = setInterval(() => {
                    success({
                        coords: {
                            latitude: 37.7749,
                            longitude: -122.4194,
                            accuracy: 10,
                            altitude: 100,
                            altitudeAccuracy: 5,
                            heading: 90,
                            speed: 25
                        },
                        timestamp: Date.now()
                    });
                }, 3000);
                return watchId;
            },
            clearWatch: () => {}
        };

        // Visit the page first
        cy.visit('/race_tracker.html');

        // Then stub the navigator and map_struct methods
        cy.window().then(win => {
            cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake(geolocation.getCurrentPosition);
            cy.stub(win.navigator.geolocation, 'watchPosition').callsFake(geolocation.watchPosition);
            cy.stub(win.navigator.geolocation, 'clearWatch').callsFake(geolocation.clearWatch);

            // Wait for map_struct to be initialized
            cy.wait(2000);

            // Make sure map_struct.MARKER exists before stubbing
            if (win.map_struct && win.map_struct.MARKER) {
                cy.stub(win.map_struct.MARKER, 'getLatLng').returns({ lat: 37.7749, lng: -122.4194 });
            } else {
                cy.log('Warning: map_struct.MARKER not available for stubbing');
            }
        });
    });

    it('open data logger tab', () => {
        cy.wait(1000);
        // check that speed is not empty
        cy.get('#speed').should('not.be.empty');
        // check that latitude is not empty
        cy.get('#latitude').should('not.be.empty');
        cy.get('#logTab').contains('Data Logger').should('exist').click();
        cy.wait(1000);
        cy.get('#startLogBtn').contains("Start Logging").should('exist').click();
        cy.wait(1000);
        cy.get('#stopLogBtn').contains('Stop Logging').should('exist').click();
        cy.get('div').contains('Data Logger').should('exist');
        cy.wait(1000);
        cy.get('button').contains('Clear Log').should('exist').click();

    });
});