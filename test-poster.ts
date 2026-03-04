import { generatePosterWithGemini } from './lib/gemini';

async function main() {
    try {
        console.log("Testing generation...");
        const url = await generatePosterWithGemini({
            photoUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000&auto=format&fit=crop",
            businessName: "Burger Joint",
            businessType: "Fast Food",
            customText: "50% OFF TODAY",
            dishName: "Classic Cheeseburger",
            dishDescription: "A juicy beef patty with melted cheese, fresh lettuce, and our secret sauce.",
            phone: "123-456-7890",
            website: "www.burgerjoint.com",
            address: "123 Test St, Dubai",
            primaryColor: "#FF0000",
            tone: "casual",
            style: "minimal",
            restaurantId: "test-id"
        });
        console.log("Success:", url);
    } catch (e: any) {
        console.error("Error from generatePosterWithGemini:");
        console.error(e);
    }
}

main();
