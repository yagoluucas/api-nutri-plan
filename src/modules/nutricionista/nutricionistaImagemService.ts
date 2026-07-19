import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../config/cloudinary.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";

type TipoImagemNutricionista = "perfil" | "capa";

type ImagemNutricionistaUpload = {
  buffer: Buffer;
  tipo: TipoImagemNutricionista;
  idNutricionista: string;
};

type ImagemNutricionistaResultado = {
  url: string;
};

function erroCloudinary() {
  return new Error("Nao foi possivel salvar a imagem.", {
    cause: {
      cause: "Internal Server Error",
      internalCause: "Unexpected Error",
      statusCode: 502,
    } as IErrorCause,
  });
}

function uploadBuffer(
  buffer: Buffer,
  options: UploadApiOptions,
) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error || !result) {
          reject(erroCloudinary());
          return;
        }

        resolve(result);
      },
    );

    uploadStream.end(buffer);
  });
}

function obterTransformacaoImagem(tipo: TipoImagemNutricionista) {
  if (tipo === "perfil") {
    return {
      width: 512,
      height: 512,
      crop: "fill",
      gravity: "auto",
    };
  }

  return {
    width: 1600,
    height: 600,
    crop: "fill",
    gravity: "auto",
  };
}

async function enviarImagemNutricionista({
  buffer,
  tipo,
  idNutricionista,
}: ImagemNutricionistaUpload): Promise<ImagemNutricionistaResultado> {
  const publicId = `nutri-plan/nutricionistas/${idNutricionista}/${tipo}`;
  const uploadResult = await uploadBuffer(buffer, {
    public_id: publicId,
    resource_type: "image",
    overwrite: true,
    invalidate: true,
    unique_filename: false,
    use_filename: false,
  });

  const url = cloudinary.url(uploadResult.public_id, {
    secure: true,
    resource_type: "image",
    type: "upload",
    fetch_format: "auto",
    quality: "auto",
    transformation: [obterTransformacaoImagem(tipo)],
  });

  return {
    url,
  };
}

export {
  enviarImagemNutricionista,
};
