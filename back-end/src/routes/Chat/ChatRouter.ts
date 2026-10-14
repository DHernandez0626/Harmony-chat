import { Router } from "express";
import multer from "multer";

const chatRouter = Router({ mergeParams: true });

const upload = multer();
chatRouter.use(upload.array("user_images"));

export default chatRouter;