import mongoose, { Schema } from "mongoose";
import {
  IPacienteDB,
  IPacienteMethods,
  IPacienteSchema,
  PacienteModel,
} from "../interfaces/usuarios/pacienteInterfaces.js";
import {
  decryptString,
  encryptStringIfNeeded,
} from "../utils/encryption.js";

const PATIENT_FIELD_CONTEXTS = {
  nome: "paciente:nome",
  sobrenome: "paciente:sobrenome",
  email: "paciente:email",
  dataNascimento: "paciente:data-nascimento",
  sexo: "paciente:sexo",
  observacoes: "paciente:observacoes",
} as const;

const pacienteSchema = new Schema<IPacienteDB, PacienteModel, IPacienteMethods>(
  {
    idNutricionista: { type: String, required: true, trim: true, index: true },
    nome: { type: String, required: true },
    sobrenome: { type: String, required: true },
    email: { type: String },
    dataNascimento: { type: String },
    sexo: { type: String, required: true },
    observacoes: { type: String },
    qtdPlanos: { type: Number, min: 0, default: 0 },
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
