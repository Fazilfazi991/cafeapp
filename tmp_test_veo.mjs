
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testVeo() {
    const genAI = new GoogleGenerativeAI('DUMMY_KEY');
    
    try {
        console.log('\n--- Testing Veo 3.0 SDK Structure ---');
        const model = genAI.getGenerativeModel({ model: "veo-3.0-generate-preview" });
        console.log('Model object keys:', Object.keys(model));
        
        // Use property inspection
        const proto = Object.getPrototypeOf(model);
        console.log('Prototype keys:', Object.keys(proto));

        // Check for all methods
        const allMethods = Object.getOwnPropertyNames(proto);
        console.log('All available methods on prototype:', allMethods);

        if (typeof model.generateContent === 'function') {
            console.log('model.generateContent EXISTS');
        }

    } catch (err) {
        console.error('Test failed:', err);
    }
}

testVeo();
