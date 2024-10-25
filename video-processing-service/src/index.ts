import express from "express";
import ffmpeg from "fluent-ffmpeg"; //"fluent-ffmpeg" is just nodejs wrapper around "ffmpeg"

const app = express();
app.use(express.json());
// const port = 3000;

// app.get("/", (req, res) => {
//     res.send("Hello, world!");    
// });
app.post("/process-video", (req, res) => {
    //get path of the input video file from the request body
    const inputFilePath = req.body.inputFilePath;
    const outputputFilePath = req.body.outputFilePath;

    if(!inputFilePath || !outputputFilePath){
        res.status(400).send("Bad Request: Missing file path.");
    }

    ffmpeg(inputFilePath)
        .outputOptions("-vf", "scale=-2:720") // scale the video to 360p
        // .outputOptions("-c:v", "libx264") // use "hevc_videotoolbox" to run locally on mac
        .on('progress', (progress) => {
            console.log(`Processing: ${progress.percent}% done`)
        })
        .on("end", () => { //since this is synchronous, the program may reach here before the video processing is done...
            res.status(200).send("Video processing started.")
        })
        .on("error", (err) => {
            console.log(`An error occurred: ${err.message}`);
            res.status(500).send(`Internal Server Error: ${err.message}`);
        })
        .save(outputputFilePath);

});

const port = process.env.PORT || 3000; //default port is 3000 but can be overridden when deploying
app.listen(port, () => {
    console.log(`Video processing service listening at http://localhost:${port}`);
});
