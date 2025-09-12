import express from "express";
import dotenv from "dotenv";
import { z } from "zod"
import bodyParser from "body-parser";
import path from "path"

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatPromptTemplate } from "@langchain/core/prompts";

dotenv.config();
const port = process.env.PORT || 3000;
const app = express();
app.use(express.json())
app.use(bodyParser.json())
const ___dirname = path.resolve();

// Create LLm
const model = new ChatGoogleGenerativeAI({
    model: "models/gemini-2.5-flash",
    maxOutputTokens: 2048,
    temperature: 0.7,
    apiKey: process.env.GEMINI_KEY
})

// we have to create our dynamic tool where llm will get this tool and respond according to this

const getMenuTool = new DynamicStructuredTool({
    name: "getMenu",
    description: "Returns the final answer today's menu for the given category (breakfast , dinner , lunch) use this tool directly answer of the question",
    schema: z.object({
        category: z.string().describe("Type of food. Example : breakfast , dinner , lunch")
    }),
    func: async ({ category }) => {
        const menus = {
            breakfast: "Idli, Dosa, Paratha, Poha, Upma, Omelette, Sandwich, Pancakes, Cereal, Fruits",
            dinner: "Chapati, Jeera Rice, Dal Tadka, Chicken Curry, Paneer Butter Masala, Mixed Veg, Khichdi, Pulao, Soup, Salad",
            lunch: "Rice, Dal, Roti, Paneer Curry, Vegetable Sabzi, Salad, Curd, Rajma, Chole, Fish Curry"
        }
        return menus[category.toLowerCase()] || "No menu found"
    }
});

// creating prompt 
const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful assistant , you uses the tools when needed"],
    ["human", "{input}"],
    ["ai", "{agent_scratchpad}"]
]);

// create calling tool

const agent = await createToolCallingAgent({
    llm: model,
    tools: [getMenuTool],
    prompt
});

// executor of agent 

const executor = await AgentExecutor.fromAgentAndTools({
    agent,
    tools: [getMenuTool],
    verbose: true,
    maxIterations : 1,
    returnIntermediateSteps : true // throw observation 
})

app.get("/", (req, res) => {
    res.sendFile(path.join(___dirname, "public", "index.html"))
});


app.post("/api/chat", async (req, res) => {
    const { input } = req.body;
    console.log("User input : ", input);

    try {
        const response = await executor.invoke({ input });
        console.log("Ai response :", response.output);
        const observeData =  response.intermediateSteps[0].observation; // when agent find answer in first time but data throw max token error
        if (!response.output && response.output != "Agent stopped due to max iterations.") {
            return res.status(404).json({ message: "Could not generate menu" });
        }else if(observeData != null){
            return res.status(404).json({ message: observeData });
        }
        res.status(200).json({ message: response.output });
    } catch (error) {
        console.log("Error getting :", error.message);
        return res.status(500).json({ message: "Something went wrong" });
    }
});





app.listen(port, () => console.log(`Server is running on http://localhost:${port}`))