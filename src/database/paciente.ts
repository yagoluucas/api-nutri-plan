import mongoose, { Schema } from "mongoose";
import {
  IPacienteDB,
  IPacienteMethods,
  IPacienteSchema,
  PacienteModel,
} from "../interfaces/usuarios/pacienteInterfaces.js";
import { IPlanoAlimentarSchema } from "../interfaces/planoAlimentar/planoAlimentarInterfaces.js";
import {
  decryptJson,
  decryptString,
  encryptJson,
  encryptStringIfNeeded,
  isAesGcmEncrypted,
  PATIENT_DIET_PLAN_CONTEXT,
} from "../utils/encryption.js";

const PATIENT_FIELD_CONTEXTS = {
  nome: "paciente:nome",
  sobrenome: "paciente:sobrenome",
  email: "paciente:email",
  dataNascimento: "paciente:data-nascimento",
  sexo: "paciente:sexo",
  observacoes: "paciente:observacoes",
} as const;

type PlanoAlimentarPersistidoDocumento = {
  tituloPlano?: string;
  planoAtivo?: boolean;
  conteudoProtegido?: string;
  objetivoDoPlano?: string;
  observacoesGerais?: string;
  refeicoes?: unknown[];
  set?: (path: string, value: unknown) => void;
  toObject?: () => Record<string, unknown>;
};

const medidaSelecionadaSchema = new Schema(
  {
    nomeMedida: { type: String, required: true },
    total: { type: Number, required: true, min: Number.MIN_VALUE },
    unidadeMedida: { type: String, required: true },
    tipoMedida: {
      type: String,
      enum: ["Caseira", "Tecnica"],
      required: true,
    },
  },
  { _id: false },
);

const alimentoPlanoSchema = new Schema(
  {
    codigoAlimento: { type: String, required: true },
    quantidade: { type: Number, required: true, min: Number.MIN_VALUE },
    medidaSelecionada: { type: medidaSelecionadaSchema, required: true },
  },
  { _id: false },
);

const refeicaoPlanoSchema = new Schema(
  {
    nome: { type: String, trim: true },
    horario: { type: String },
    observacoes: { type: String },
    alimentos: { type: [alimentoPlanoSchema] },
  },
  { _id: false },
);

const planoAlimentarSchema = new Schema(
  {
    conteudoProtegido: { type: String },
    // Campos legados temporarios. Sao removidos quando o documento e salvo.
    objetivoDoPlano: { type: String },
    planoAtivo: { type: Boolean, default: true },
    observacoesGerais: { type: String },
    refeicoes: { type: [refeicaoPlanoSchema] },
  },
  { _id: true },
);

const pacienteSchema = new Schema<IPacienteDB, PacienteModel, IPacienteMethods>(
  {
    idNutricionista: { type: String, required: true, trim: true, index: true },
    nome: { type: String, required: true },
    sobrenome: { type: String, required: true },
    email: { type: String },
    dataNascimento: { type: String },
    sexo: { type: String, required: true },
    observacoes: { type: String },
    planosAlimentares: { type: [planoAlimentarSchema], default: [] },
  },
  {
    timestamps: true,
  },
);

function protegerCampoPaciente(
  paciente: mongoose.HydratedDocument<IPacienteDB, IPacienteMethods>,
  campo: keyof typeof PATIENT_FIELD_CONTEXTS,
) {
  const valor = paciente.get(campo);

  if (typeof valor !== "string" || valor.length === 0) {
    return;
  }

  paciente.set(
    campo,
    encryptStringIfNeeded(valor, PATIENT_FIELD_CONTEXTS[campo]),
  );
}

function getPlanoPersistido(plano: PlanoAlimentarPersistidoDocumento) {
  return typeof plano.toObject === "function" ? plano.toObject() : plano;
}

function getPlanoAtivo(plano: PlanoAlimentarPersistidoDocumento) {
  return typeof plano.planoAtivo === "boolean" ? plano.planoAtivo : true;
}

function protegerPlanosAlimentares(
  paciente: mongoose.HydratedDocument<IPacienteDB, IPacienteMethods>,
) {
  const planos = (paciente.planosAlimentares ?? []) as unknown as
    PlanoAlimentarPersistidoDocumento[];
  let houveAlteracao = false;

  for (const plano of planos) {
    const planoPersistido = getPlanoPersistido(plano);
    const conteudoProtegido = planoPersistido.conteudoProtegido;

    if (
      typeof conteudoProtegido === "string" &&
      isAesGcmEncrypted(conteudoProtegido)
    ) {
      if (typeof planoPersistido.planoAtivo !== "boolean") {
        if (typeof plano.set === "function") {
          plano.set("planoAtivo", true);
        } else {
          plano.planoAtivo = true;
        }

        houveAlteracao = true;
      }

      continue;
    }

    const planoValidado =
      typeof conteudoProtegido === "string"
        ? IPlanoAlimentarSchema.parse(
            decryptJson<unknown>(conteudoProtegido, PATIENT_DIET_PLAN_CONTEXT),
          )
        : IPlanoAlimentarSchema.parse({
            tituloPlano: planoPersistido.tituloPlano,
            objetivoDoPlano: planoPersistido.objetivoDoPlano,
            observacoesGerais: planoPersistido.observacoesGerais,
            refeicoes: planoPersistido.refeicoes,
          });

    const novoConteudoProtegido = encryptJson(
      planoValidado,
      PATIENT_DIET_PLAN_CONTEXT,
    );

    if (typeof plano.set === "function") {
      plano.set("planoAtivo", getPlanoAtivo(planoPersistido));
      plano.set("conteudoProtegido", novoConteudoProtegido);
      plano.set("tituloPlano", undefined);
      plano.set("objetivoDoPlano", undefined);
      plano.set("observacoesGerais", undefined);
      plano.set("refeicoes", undefined);
    } else {
      plano.planoAtivo = getPlanoAtivo(planoPersistido);
      plano.conteudoProtegido = novoConteudoProtegido;
      delete plano.tituloPlano;
      delete plano.objetivoDoPlano;
      delete plano.observacoesGerais;
      delete plano.refeicoes;
    }

    houveAlteracao = true;
  }

  if (houveAlteracao) {
    paciente.markModified("planosAlimentares");
  }
}

function getCampoCriptografadoObrigatorio(
  valor: unknown,
  nomeCampo: string,
) {
  if (typeof valor !== "string" || valor.length === 0) {
    throw new Error(`Campo criptografado invalido: ${nomeCampo}.`);
  }

  return valor;
}

function getCampoCriptografadoOpcional(valor: unknown) {
  return typeof valor === "string" && valor.length > 0 ? valor : undefined;
}

pacienteSchema.pre("save", function () {
  protegerCampoPaciente(this, "nome");
  protegerCampoPaciente(this, "sobrenome");
  protegerCampoPaciente(this, "email");
  protegerCampoPaciente(this, "dataNascimento");
  protegerCampoPaciente(this, "sexo");
  protegerCampoPaciente(this, "observacoes");
  protegerPlanosAlimentares(this);
});

pacienteSchema.methods.getNomeDescriptografado = function () {
  return decryptString(
    getCampoCriptografadoObrigatorio(this.nome, "nome"),
    PATIENT_FIELD_CONTEXTS.nome,
  );
};

pacienteSchema.methods.getSobrenomeDescriptografado = function () {
  return decryptString(
    getCampoCriptografadoObrigatorio(this.sobrenome, "sobrenome"),
    PATIENT_FIELD_CONTEXTS.sobrenome,
  );
};

pacienteSchema.methods.getEmailDescriptografado = function () {
  const email = getCampoCriptografadoOpcional(this.email);

  return email
    ? decryptString(email, PATIENT_FIELD_CONTEXTS.email)
    : undefined;
};

pacienteSchema.methods.getDataNascimentoDescriptografada = function () {
  const dataNascimento = getCampoCriptografadoOpcional(this.dataNascimento);

  return dataNascimento
    ? new Date(
        decryptString(
          dataNascimento,
          PATIENT_FIELD_CONTEXTS.dataNascimento,
        ),
      )
    : undefined;
};

pacienteSchema.methods.getSexoDescriptografado = function () {
  return IPacienteSchema.shape.sexo.parse(
    decryptString(
      getCampoCriptografadoObrigatorio(this.sexo, "sexo"),
      PATIENT_FIELD_CONTEXTS.sexo,
    ),
  );
};

pacienteSchema.methods.getObservacoesDescriptografadas = function () {
  const observacoes = getCampoCriptografadoOpcional(this.observacoes);

  return observacoes
    ? decryptString(observacoes, PATIENT_FIELD_CONTEXTS.observacoes)
    : undefined;
};

const Paciente = mongoose.model<IPacienteDB, PacienteModel>(
  "Paciente",
  pacienteSchema,
);

export default Paciente;
