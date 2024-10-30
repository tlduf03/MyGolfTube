//1. GCS (Google Cloud Storage) file interaction
//2. Local file interaction
//3. The functions declared here will be called by the main program (index.ts)
import { Storage } from "@google-cloud/storage";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

const storage = new Storage();

const rawVideoBucketName = "june-raw-videos";
const processedVideoBucketName = "june-processed-videos";

const localRawVideoPath = "./raw-videos";
const localProcessedVideoPath = "./processed-videos";

/**
 * Creates the directories within the docker container for storing raw and processed video files.
 */
export function setupDirectory() {
    ensureDirectoryExists(localRawVideoPath);
    ensureDirectoryExists(localProcessedVideoPath);
}

/**
 * @param fileName - The name of the raw video file from {@link localRawVideoPath}.
 * @param fileName - The name of the processed video to {@link localProcessedVideoPath}.
 * @returns A promise that resolves when the video conversion is complete.
 */
export function convertVideo(rawVideoName:string, processedVideoName:string) {
    return new Promise((resolve, reject) => {
        ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
        .outputOptions("-vf", "scale=-2:720") // scale the video to 360p
        // .outputOptions("-c:v", "libx264") // use "hevc_videotoolbox" to run locally on mac
        .on('progress', (progress) => {
            console.log(`Processing: ${progress.percent}% done`);
        })
        .on("end", () => { //since this is synchronous, the program may reach here before the video processing is done...
            console.log("Video processing started.");
            resolve(true);
        })
        .on("error", (err) => {
            console.log(`An error occurred: ${err.message}`);
            reject(err);
        })
        .save(`${localProcessedVideoPath}/${processedVideoName}`);
    })
}

/**
 * @param fileName - The name of the raw video file from {@link rawVideoBucketName} to {@link localRawVideoPath}.
 * @returns A promise that resolves when the video download is complete.
 */
export async function downloadRawVideo(fileName:string) {
    await storage.bucket(rawVideoBucketName)
        .file(fileName)
        .download({destination: `${localRawVideoPath}/${fileName}`});

    console.log(
        `gs://${rawVideoBucketName}/${fileName} downloaded to ${localRawVideoPath}/${fileName}.`
    )
}

/**
 * @param fileName - The name of the processed video file from {@link localProcessedVideoPath} to {@link processedVideoBucketName}.
 * @returns A promise that resolves when the video upload is complete.
 */
export async function uploadProcessedVideo(fileName:string) {
    const bucket = storage.bucket(processedVideoBucketName);

    await bucket.upload(`${localProcessedVideoPath}/${fileName}`, {
        destination: fileName
    });
    console.log(
        `gs://${localProcessedVideoPath}/${fileName} uploaded to ${processedVideoBucketName}/${fileName}.`
    )

    await bucket.file(fileName).makePublic();
}

/**
 *  @param fileName - The name of the file to delete from the {@link localRawVideoPath}.
 *  @returns A promise that resolves when the file is deleted.
 */
export function deleteRawVideo(fileName:string){
    return deleteFile(`${localRawVideoPath}/${fileName}`);
}

/**
 * @param fileName - The Name of the file to delete from the {@link localProcessedVideoPath}.
 * @returns - A promise that resolves when the file is deleted.
 */
export function deleteProcessedVideo(fileName:string){
    return deleteFile(`${localProcessedVideoPath}/${fileName}`);
}

/**
 * @param filePath - The path of the file to delete.
 * @returns A promise that resolves when the file is deleted.
 */
function deleteFile(filePath:string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            // reject(`File ${filePath} does not exist.`);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.log(`Failed to delete the file at ${filePath}.`);
                    reject(err);
                } else {
                    console.log(`File deleted at ${filePath}.`);
                    resolve();
                }
            })
        } else {
            console.log(`File not found at ${filePath}, skipping the delete.`);
            resolve();
        }
    })
}

/**
 * Ensure a directory exists, creating it if necessary.
 * @param {string} dirPath - The directory to check.
 */
function ensureDirectoryExists(dirPath:string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true }); // recursive: true enables creating nested directories
        console.log(`Directory created: ${dirPath}`);
    }
}