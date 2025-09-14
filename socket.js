import express from "express";
import http from "http";
import { Server } from "socket.io"
import path from "path"

const ___dirname = path.resolve();
const port = 4000;
const app = express();
const server = http.createServer(app);
const io = new Server(server);


app.get("/" , (req , res) => {
   res.sendFile(path.join(___dirname , "public" , "socket.html"))
});

// Socket.IO connection handler
io.on("connection" , (socket) => {
    console.log("new connection : " , socket.id);

    // Handle new messages
    socket.on("chat-message" , (msg) => {
        console.log("message :" , msg)

        // Broadcast the message to all connected clients
        io.emit("chat-message" , msg)
    });

    // Handle disconnection
    socket.on('disconnect' , () => {
        console.log("User disconnect")
    })
})



server.listen(port , () => console.log(`Server is running on http://localhost:${port}`))