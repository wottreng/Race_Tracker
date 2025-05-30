describe('tracker frontend test', () => {
    beforeEach(() => {
        // Visit the page first
        cy.visit('/race_tracker.html');

    });

    it('test open graph tab', () => {
        cy.get('#GraphDataTab > .tab-content').should('exist').click();
        cy.wait(1000);
        cy.get('#graphPanel > :nth-child(2) > :nth-child(1) > .btn').should('exist').click();
        cy.get(':nth-child(2) > :nth-child(2) > .btn').should('exist').click();
    });

    it('open map tab and test map', () => {
        cy.get('#mapTab > .tab-content').should('exist').click();
        cy.wait(1000);
        cy.get('[onclick="plotDataLogOnMap()"] > span').should('exist');
        cy.get('[onclick="clearMap()"] > span').should('exist');
    });

    it('open data logger tab and test logging', () => {
        cy.wait(1000);
        // check that speed is not empty
        cy.get('#speed').should('not.be.empty');
        // check that latitude is not empty
        cy.get('#latitude').should('not.be.empty');
        cy.get('#logTab').contains('Data Logger').should('exist').click();
        cy.wait(1000);
        cy.get('#startLogBtn').contains("Start Logging").should('exist').click();
        cy.wait(2000);
        cy.get('#stopLogBtn').contains('Stop Logging').should('exist').click();
        cy.get('div').contains('Data Logger').should('exist');
        cy.wait(1000);
        cy.get('button').contains('Clear Log').should('exist').click();

    });

    it('open options tab and test options', () => {
        cy.get('#optionTab').contains('Options').should('exist').click();
        cy.wait(1000);
        cy.get('[onclick="reset_GPS()"] > span').should('exist').click();
        cy.get('#toast').should('exist');
        cy.wait(1000);
        cy.get('[onclick="resetMaxSpeed()"] > span').should('exist').click();
        cy.wait(1000);
        cy.get('[onclick="resetMaxG()"] > span').should('exist').click();
        cy.get('#toast').should('exist');
        cy.wait(1000);
    });

});