describe("Technician Voice Flow", () => {
  beforeEach(() => {
    // Clear IndexedDB local state before each test
    cy.window().then((win) => {
      win.indexedDB.deleteDatabase("voiceassistant_offline");
    });
  });

  it("should log in as a technician and interact with voice assistant", () => {
    // 1. Visit Login Page
    cy.visit("/login");
    cy.get('input[name="email"]').type("tech@voxfield.com");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();

    // 2. Redirected to /dashboard or /technician
    cy.url().should("include", "/technician");

    // 3. Verify page elements
    cy.get("h2").contains("Voice Assistant").should("be.visible");
    cy.get("button").find("svg").should("be.visible"); // Microphone icon visible

    // 4. Simulate a voice query submit via typing (Cypress cannot easily speak into the mic,
    // so we mock the STT API call or test typing fallback if present,
    // or intercept the STT API endpoint and trigger mic click)
    cy.intercept("POST", "/api/stt", {
      statusCode: 200,
      body: { text: "what is the history of HVAC-R1-01" },
    }).as("sttCall");

    cy.intercept("POST", "/api/voice-query", {
      statusCode: 201,
      body: {
        data: {
          agentResponse: "Carrier HVAC Unit has a repair record from June 15, 2022.",
          transcriptId: "mock-tx-123",
          sessionId: "mock-session-123",
        },
      },
    }).as("queryCall");

    cy.contains("Voice Assistant Ready").should("be.visible");
    cy.wait(500);
    cy.get('button[aria-label="Toggle Voice Assistant"]').click(); // Start recording
    cy.contains("Tap to stop recording").should("be.visible");
    cy.wait(500);
    cy.get('button[aria-label="Toggle Voice Assistant"]').click(); // Stop recording

    cy.wait("@sttCall");
    cy.wait("@queryCall");

    // Verify UI reflects transcribed text and response
    cy.contains("what is the history of HVAC-R1-01").should("be.visible");
    cy.contains("Carrier HVAC Unit has a repair record").should("be.visible");
  });
});
