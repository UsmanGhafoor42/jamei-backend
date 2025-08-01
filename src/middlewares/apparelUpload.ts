import multer from "multer";
import path from "path";
import fs from "fs";

// Dynamic destination based on productId
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use a temp id if not present yet (will rename after save)
    const tempId = req.body.id || "temp";
    const uploadPath = path.join(
      __dirname,
      "../../uploads/apparel",
      tempId.toString()
    );
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`);
  },
});

const fileFilter = (_req: any, file: any, cb: any) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "image/svg+xml",
    "image/webp",
  ];
  cb(null, allowedTypes.includes(file.mimetype));
};

export const apparelUpload = multer({ storage, fileFilter });
