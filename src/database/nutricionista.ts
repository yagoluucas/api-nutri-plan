import bcrypt from "bcrypt";
import mongoose, { Schema } from "mongoose";
import {
  INutricionistaDB,
  INutricionistaMethods,
  INutricionistaSchema,
  NutricionistaModel,
} from "../interfaces/usuarios/nutricionistaInterfaces.js";
import { decryptString, encryptStringIfNeeded } from "../utils/encryption.js";
import {
  createSearchHash,
  normalizeCrnForSearch,
  normalizeEmailForSearch,
} from "../utils/searchHash.js";

const NUTRITIONIST_FIELD_CONTEXTS = {
  nome: "nutricionista:nome",
  sobrenome: "nutricionista:sobrenome",
  email: "nutricionista:email",
  dataNascimento: "nutricionista:data-nascimento",
  crn: "nutricionista:crn",
} as const;

type CampoProtegidoNutricionista = keyof typeof NUTRITIONIST_FIELD_CONTEXTS;
type NutricionistaDocument = mongoose.HydratedDocument<
  INutricionistaDB,
  INutricionistaMethods
>;

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const TRUSTED_PASSWORD_HASH_LOCAL = "trustedPasswordHash";

const alimentoFavoritoSchema = new Schema(
  {
    idAlimento: { type: String, required: true, trim: true },
    nomeAlimento: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const nutricionistaSchema = new Schema<
  INutricionistaDB,
  NutricionistaModel,
  INutricionistaMethods
>(
  {
    crn: { type: String, required: true },
    nome: { type: String, required: true },
    sobrenome: { type: String, required: true },
    email: { type: String, required: true },
    emailHash: { type: String, required: true, select: false },
    crnHash: { type: String, required: true, select: false },
    dataNascimento: {
      type: String,
      required: true,
      set: (value: unknown) =>
        value instanceof Date ? value.toISOString() : value,
    },
    senha: {
      type: String,
      required: true,
      select: false,
    },
    alimentosFavoritos: { type: [alimentoFavoritoSchema], default: [] },
    imagemPerfil: { type: String, trim: true },
    imagemCapa: { type: String, trim: true },
    archivedAt: { type: Date },
    purgeAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

nutricionistaSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

function getCampoTextoClaroObrigatorio(
  nutricionista: NutricionistaDocument,
  campo: CampoProtegidoNutricionista,
) {
  const valor = nutricionista.get(campo) as unknown;

  if (valor instanceof Date) {
    return valor.toISOString();
  }

  if (typeof valor !== "string" || valor.length === 0) {
    throw new Error(`Campo criptografado invalido: ${campo}.`);
  }

  return decryptString(valor, NUTRITIONIST_FIELD_CONTEXTS[campo]);
}

function getCampoTextoClaroOpcional(
  nutricionista: NutricionistaDocument,
  campo: CampoProtegidoNutricionista,
) {
  const valor = nutricionista.get(campo);

  if (typeof valor !== "string" || valor.length === 0) {
    return undefined;
  }

  return decryptString(valor, NUTRITIONIST_FIELD_CONTEXTS[campo]);
}

function protegerCampoNutricionista(
  nutricionista: NutricionistaDocument,
  campo: CampoProtegidoNutricionista,
) {
  const valorClaro = getCampoTextoClaroOpcional(nutricionista, campo);

  if (!valorClaro) {
    return;
  }

  nutricionista.set(
    campo,
    encryptStringIfNeeded(valorClaro, NUTRITIONIST_FIELD_CONTEXTS[campo]),
  );
}

function atualizarHashesBusca(nutricionista: NutricionistaDocument) {
  if (nutricionista.isModified("email") || !nutricionista.get("emailHash")) {
    const email = getCampoTextoClaroObrigatorio(nutricionista, "email");

    nutricionista.set(
      "emailHash",
      createSearchHash(normalizeEmailForSearch(email)),
    );
  }

  if (nutricionista.isModified("crn") || !nutricionista.get("crnHash")) {
    const crn = getCampoTextoClaroObrigatorio(nutricionista, "crn");

    nutricionista.set("crnHash", createSearchHash(normalizeCrnForSearch(crn)));
  }
}

function getCampoCriptografadoObrigatorio(valor: unknown, nomeCampo: string) {
  if (typeof valor !== "string" || valor.length === 0) {
    throw new Error(`Campo criptografado invalido: ${nomeCampo}.`);
  }

  return valor;
}

nutricionistaSchema.index(
  { emailHash: 1 },
  {
    unique: true,
    partialFilterExpression: { emailHash: { $type: "string" } },
  },
);
nutricionistaSchema.index(
  { crnHash: 1 },
  {
    unique: true,
    partialFilterExpression: { crnHash: { $type: "string" } },
  },
);

nutricionistaSchema.pre("validate", function () {
  atualizarHashesBusca(this);
  protegerCampoNutricionista(this, "nome");
  protegerCampoNutricionista(this, "sobrenome");
  protegerCampoNutricionista(this, "email");
  protegerCampoNutricionista(this, "dataNascimento");
  protegerCampoNutricionista(this, "crn");
});

nutricionistaSchema.pre("save", async function () {
  if (!this.isModified("senha")) return;

  if (this.$locals[TRUSTED_PASSWORD_HASH_LOCAL] === true) {
    if (
      !BCRYPT_HASH_PATTERN.test(this.senha) ||
      bcrypt.getRounds(this.senha) < 10
    ) {
      throw new Error("Hash bcrypt interno invalido.");
    }

    delete this.$locals[TRUSTED_PASSWORD_HASH_LOCAL];
    return;
  }

  const saltRounds = 10;
  this.senha = await bcrypt.hash(this.senha, saltRounds);
});

nutricionistaSchema.methods.validarSenha = async function (
  senhaInformada: string,
): Promise<boolean> {
  return bcrypt.compare(senhaInformada, this.senha);
};

nutricionistaSchema.methods.getNomeDescriptografado = function () {
  return INutricionistaSchema.shape.nome.parse(
    decryptString(
      getCampoCriptografadoObrigatorio(this.nome, "nome"),
      NUTRITIONIST_FIELD_CONTEXTS.nome,
    ),
  );
};

nutricionistaSchema.methods.getSobrenomeDescriptografado = function () {
  return INutricionistaSchema.shape.sobrenome.parse(
    decryptString(
      getCampoCriptografadoObrigatorio(this.sobrenome, "sobrenome"),
      NUTRITIONIST_FIELD_CONTEXTS.sobrenome,
    ),
  );
};

nutricionistaSchema.methods.getEmailDescriptografado = function () {
  return INutricionistaSchema.shape.email.parse(
    decryptString(
      getCampoCriptografadoObrigatorio(this.email, "email"),
      NUTRITIONIST_FIELD_CONTEXTS.email,
    ),
  );
};

nutricionistaSchema.methods.getDataNascimentoDescriptografada = function () {
  const dataNascimento = decryptString(
    getCampoCriptografadoObrigatorio(this.dataNascimento, "dataNascimento"),
    NUTRITIONIST_FIELD_CONTEXTS.dataNascimento,
  );
  const dataNascimentoDescriptografada = new Date(dataNascimento);

  return Number.isNaN(dataNascimentoDescriptografada.getTime())
    ? undefined
    : dataNascimentoDescriptografada;
};

nutricionistaSchema.methods.getCrnDescriptografado = function () {
  return INutricionistaSchema.shape.crn.parse(
    decryptString(
      getCampoCriptografadoObrigatorio(this.crn, "crn"),
      NUTRITIONIST_FIELD_CONTEXTS.crn,
    ),
  );
};

const Nutricionista = mongoose.model<INutricionistaDB, NutricionistaModel>(
  "Nutricionista",
  nutricionistaSchema,
);

function marcarSenhaHasheadaComoConfiavel(
  nutricionista: NutricionistaDocument,
) {
  nutricionista.$locals[TRUSTED_PASSWORD_HASH_LOCAL] = true;
}

export { marcarSenhaHasheadaComoConfiavel };
export default Nutricionista;
