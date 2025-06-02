describe('tracker frontend test', () => {
    beforeEach(() => {
        cy.intercept('/sw.js', {
            statusCode: 200,
            body: '// Mocked service worker content'
        });
        cy.visit('/race_tracker.html');
    });

    it('open options tab and test options', () => {
        cy.get('#optionTab').contains('Options').should('exist').click();
        cy.wait(600);
        cy.get('[onclick="showKalmanFilterModal()"]').should('be.visible').click();
        cy.wait(500);
        cy.get('.modal-footer > :nth-child(1) > .btn').should('be.visible').contains('Reset').click();
        cy.wait(500);
        cy.get('.modal-footer > :nth-child(2) > .btn-primary').should('be.visible').contains('Save').click();
        cy.get(':nth-child(2) > .btn-secondary').should('be.visible').contains('Cancel').click();
        cy.wait(500);
        cy.get('[onclick="reset_GPS()"] > span').should('be.visible').should('exist').click();
        cy.get('#toast').should('be.visible').should('exist');
        cy.wait(1000);
        cy.get('[onclick="resetMaxSpeed()"] > span').should('exist').click();
        cy.get('#toast').should('be.visible').should('exist');
        cy.wait(1000);
        cy.get('[onclick="resetMaxG()"] > span').should('exist').click();
        cy.get('#toast').should('exist');
        cy.wait(1000);
    });

    it('test open graph tab', () => {
        cy.get('#GraphDataTab > .tab-content').should('exist').click();
        cy.wait(600);
        cy.get('#graphPanel > :nth-child(2) > :nth-child(1) > .btn').should('be.visible').should('exist').click();
        cy.get(':nth-child(2) > :nth-child(2) > .btn').should('exist').click();
    });

    it('open map tab and test map', () => {
        cy.get('#mapTab > .tab-content').should('exist').click();
        cy.wait(600);
        cy.get('[onclick="plotDataLogOnMap()"] > span').should('be.visible').should('exist');
        cy.get('[onclick="clearMap()"] > span').should('exist');
    });

    it('open data logger tab and test logging', () => {
        // cy.wait(1000);
        cy.get('#speed').should('not.be.empty');
        cy.get('#latitude').should('not.be.empty');
        cy.get('#logTab').should('be.visible').contains('Data Logger').should('exist').click();
        cy.get('#startLogBtn').should('be.visible').contains("Start Logging").should('exist').click();
        cy.wait(1000);
        cy.get('#stopLogBtn').should('be.visible').contains('Stop Logging').should('exist').click();
        cy.get('div').should('be.visible').contains('Data Logger').should('exist');
        cy.get('button').should('be.visible').contains('Clear Log').should('exist').click();
    });

});
