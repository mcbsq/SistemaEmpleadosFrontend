// --- CONFIGURACIÓN DINÁMICA DE LA API ---
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const apiurl = isLocal 
  ? "http://localhost:5001"  // Backend Flask local
  : "http://51.79.18.52:5001"; // Backend en producción

// Lógica para manejar los empleados y el empleado

export const cargarEmpleadosBD = async () => {
  try {
    const response = await fetch(`${apiurl}/empleados`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Error al cargar los empleados');
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Error al cargar los empleados: ${error}`);
  }
};

// Lógica para manejar la educación

export const enviarDatosEducacion = (id, datosEducacion) => {
  fetch(`${apiurl}/educacion/empleado/${id}`, {
    method: "GET",
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  })
    .then((responseEducacion) => {
      if (responseEducacion.ok) {
        // Si el empleado ya tiene una entrada, realiza una solicitud PUT
        return fetch(`${apiurl}/educacion/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(datosEducacion),
        });
      } else {
        // Si el empleado no tiene una entrada, realiza una solicitud POST
        return fetch(`${apiurl}/educacion`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(datosEducacion),
        });
      }
    })
    .then((responseEducacion) => responseEducacion.json())
    .then((dataEducacion) => {
      console.log("Respuesta del servidor (Educación):", dataEducacion);
    })
    .catch((error) => {
      console.error("Error en la solicitud POST/PUT (Educación):", error);
    });
};

export const cargarEducacionPorEmpleado = async (empleadoId) => {
  try {
    const response = await fetch(`${apiurl}/educacion/empleado/${empleadoId}`, {
      method: 'GET',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
    if (!response.ok) {
      throw new Error(`Error al cargar datos de educación: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Error al cargar datos de educación: ${error}`);
  }
};

//apiRequest de redesSociales

export const enviarDatosRedesSociales = (id, datosRedesSociales) => {
  fetch(`${apiurl}/redsocial/empleado/${id}`, {
    method: "GET",
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  })
    .then((response) => {
      if (response.ok) {
        // Si el empleado ya tiene una entrada, realiza una solicitud PUT
        return fetch(`${apiurl}/redsocial/empleado/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(datosRedesSociales),
        });
      } else {
        // Si el empleado no tiene una entrada, realiza una solicitud POST
        return fetch(`${apiurl}/redsocial`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(datosRedesSociales),
        });
      }
    })
    .then((responseRedesSociales) => {
      if (!responseRedesSociales.ok) {
        throw new Error(
          `Error al enviar datos de redes sociales: ${responseRedesSociales.status}`
        );
      }
      return responseRedesSociales.json();
    })
    .then((dataRedesSociales) => {
      console.log(
        "Respuesta del servidor (Redes Sociales):",
        dataRedesSociales
      );
      // Resto de tu lógica para manejar la respuesta del servidor...
    })
    .catch((error) => {
      console.error("Error en la solicitud POST/PUT (Redes Sociales):", error);
    });
};

export const cargarRedesSocialesPorEmpleado = async (empleadoId) => {
  try {
    const response = await fetch(`${apiurl}/redsocial/empleado/${empleadoId}`);
    if (!response.ok) {
      throw new Error(`Error al cargar datos de redes sociales: ${response.status}`);
    }
    const json = await response.json();
    if (!json || !json[0].RedesSociales) {
      return [];
    }
    return json[0].RedesSociales.map((item) => ({
      redSocialSeleccionada: item.redSocialSeleccionada,
      URLRedSocial: item.URLRedSocial,
      NombreRedSocial: item.NombreRedSocial,
    }));
  } catch (error) {
    throw new Error(`Error al cargar datos de redes sociales: ${error}`);
  }
};

//Logica para manejar datos RH

export const enviarDatosRH = ( id , datosRH) => {
    // Realiza una solicitud GET para verificar si ya existe un registro RH para el empleado
    fetch(`${apiurl}/rh/${datosRH.empleado_id}`, {
      method: "GET",
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    })
      .then((response) => {
        if (response.ok) {
          // Si el empleado ya tiene un registro RH, realiza una solicitud PUT
          return fetch(`${apiurl}/rh/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(datosRH),
          });
        } else {
          // Si el empleado no tiene un registro RH, realiza una solicitud POST
          return fetch(`${apiurl}/rh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(datosRH),
          });
        }
      })
      .then((responseRH) => {
        if (!responseRH.ok) {
          throw new Error(`Error al enviar datos RH: ${responseRH.status}`);
        }
        return responseRH.json();
      })
      .then((dataRH) => {
        console.log("Respuesta del servidor RH:", dataRH);
        // Resto de tu lógica para manejar la respuesta del servidor RH...
      })
      .catch((error) => {
        console.error("Error en la solicitud POST/PUT RH:", error);
        if (
          error instanceof TypeError &&
          error.message === "Failed to fetch"
        ) {
          console.error(
            "Posibles problemas de CORS o el servidor no está en ejecución."
          );
        }
      });
  };

export const cargarRHPorEmpleado = async (empleadoId) => {
    try {
      const response = await fetch(`${apiurl}/rh/${empleadoId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const rhData = await response.json();
      return {
        Puesto: rhData.Puesto || "",
        JefeInmediato: rhData.JefeInmediato || "",
        HorarioLaboral: {
          HoraEntrada: rhData.HorarioLaboral?.HoraEntrada || "",
          HoraSalida: rhData.HorarioLaboral?.HoraSalida || "",
          TiempoComida: rhData.HorarioLaboral?.TiempoComida || "",
          DiasTrabajados: rhData.HorarioLaboral?.DiasTrabajados || "",
        },
        ExpedienteDigitalPDF: rhData.ExpedienteDigitalPDF || null,
        empleadoid: rhData.empleado_id || empleadoId,
      };
    } catch (error) {
      throw new Error(`Error fetching Rh Data: ${error}`);
    }
 };

 export const cargarrhpuesto = async () => {
  try {
    const response = await fetch(`${apiurl}/rh`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Puedes incluir otras cabeceras si son necesarias
      },
    });
    if (!response.ok) {
      throw new Error('Error al obtener los datos de RH');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(`Error de solicitud: ${error.message}`);
  }
};

  

//Logica para manejar personas contacto

export const enviarPersonasContacto = ( id, datosPersonasContacto) => {
    // Realiza una solicitud GET para verificar si ya existe un registro de personas de contacto para el empleado
    fetch(
      `${apiurl}/personascontacto/empleado/${id}`,
      {
        method: "GET",
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
      .then((response) => {
        if (response.ok) {
          // Si el empleado ya tiene un registro, realiza una solicitud PUT para actualizarlo
          return fetch(
            `${apiurl}/personascontacto/empleado/${id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(datosPersonasContacto),
            }
          );
        } else {
          // Si el empleado no tiene un registro, realiza una solicitud POST para crearlo
          return fetch(`${apiurl}/personascontacto`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(datosPersonasContacto),
          });
        }
      })
      .then((responsePersonasContacto) => {
        if (!responsePersonasContacto.ok) {
          throw new Error(
            `Error al enviar datos de personas de contacto: ${responsePersonasContacto.status}`
          );
        }
        return responsePersonasContacto.json();
      })
      .then((dataPersonasContacto) => {
        console.log(
          "Respuesta del servidor (Personas de Contacto):",
          dataPersonasContacto
        );
        // Resto de tu lógica para manejar la respuesta del servidor...
      })
      .catch((error) => {
        console.error(
          "Error en la solicitud POST/PUT (Personas de Contacto):",
          error
        );
        if (
          error instanceof TypeError &&
          error.message === "Failed to fetch"
        ) {
          console.error(
            "Posibles problemas de CORS o el servidor no está en ejecución."
          );
        }
      });
  };

export const cargarPersonasContactoPorEmpleado = async (empleadoId) => {
    try {
      const response = await fetch(`${apiurl}/personascontacto/empleado/${empleadoId}`, {
        method: 'GET',
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
      if (!response.ok) {
        throw new Error(`Error al cargar datos de personas de contacto: ${response.status}`);
      }
      const json = await response.json();
      console.log("Respuesta completa del servidor (Personas de Contacto):", json);
  
      if (!json || !Array.isArray(json) || json.length === 0) {
        console.log("Los datos de personas de contacto no están en el formato esperado o no se han cargado.");
        return null;
      }
  
      const personasContactoData = json[0]; // Tomar el primer objeto del array
      return {
        parenstesco: personasContactoData.parenstesco,
        nombreContacto: personasContactoData.nombreContacto,
        telefonoContacto: personasContactoData.telefonoContacto,
        correoContacto: personasContactoData.correoContacto,
        direccionContacto: personasContactoData.direccionContacto,
        empleadoid: personasContactoData.empleadoid,
      };
    } catch (error) {
      throw new Error(`Error al cargar personas de contacto: ${error}`);
    }
  };
  
//Logica para manejar datos contacto

export const enviarDatosContacto = (datosContacto) => {

    // Realiza una solicitud GET para verificar si ya existe un registro de datos de contacto para el empleado
    fetch(`${apiurl}/datoscontacto/empleado/${datosContacto.empleado_id}`, {
      method: "GET",
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    })
      .then((response) => {
        if (response.ok) {
          // Si el empleado ya tiene un registro, realiza una solicitud PUT para actualizarlo
          return fetch(
            `${apiurl}/datoscontacto/empleado/${datosContacto.empleado_id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(datosContacto),
            }
          );
        } else {
          // Si el empleado no tiene un registro, realiza una solicitud POST para crearlo
          return fetch(`${apiurl}/datoscontacto`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(datosContacto),
          });
        }
      })
      .then((responseDatosContacto) => {
        if (!responseDatosContacto.ok) {
          throw new Error(
            `Error al enviar datos de contacto: ${responseDatosContacto.status}`
          );
        }
        return responseDatosContacto.json();
      })
      .then((dataDatosContacto) => {
        console.log(
          "Respuesta del servidor (Datos de Contacto):",
          dataDatosContacto
        );
        // Resto de tu lógica para manejar la respuesta del servidor...
      })
      .catch((error) => {
        console.error(
          "Error en la solicitud POST/PUT (Datos de Contacto):",
          error
        );
        if (
          error instanceof TypeError &&
          error.message === "Failed to fetch"
        ) {
          console.error(
            "Posibles problemas de CORS o el servidor no está en ejecución."
          );
        }
      });
  };

export const cargarDatosContactoPorEmpleado = async (empleadoId) => {
    try {
      const response = await fetch(`${apiurl}/datoscontacto/empleado/${empleadoId}`, {
        method: 'GET',
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
      if (!response.ok) {
        throw new Error(`Error al cargar datos de contacto: ${response.status}`);
      }
      const json = await response.json();
      console.log("Respuesta completa del servidor (Datos de Contacto):", json);
  
      if (!json || !json["_id"]) {
        console.log("Los datos de contacto no están en el formato esperado o no se han cargado.");
        return null;
      }
  
      const datosContactoData = json; // No es necesario tratarlo como un array
      // Actualiza el estado con los datos de contacto
      return {
        telefonoF: datosContactoData.TelFijo,
        telefonoC: datosContactoData.TelCelular,
        direccion: datosContactoData.Direccion,
        IDwhatsapp: datosContactoData.IdWhatsApp,
        IDtelegram: datosContactoData.IdTelegram,
        correo: datosContactoData.ListaCorreos,
        empleadoid: datosContactoData.empleadoId,
      };
    } catch (error) {
      throw new Error(`Error al cargar datos de contacto: ${error}`);
    }
  };  

//Logica para manejar expediente clinico

export const enviarDatosExpedienteClinico = (id, datosExpedienteClinico) => {
    // Realiza una solicitud GET para verificar si ya existe un expediente clínico para el empleado
    fetch(`${apiurl}/expedienteclinico/empleado/${id}`, {
      method: "GET",
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    })
      .then((expedienteClinico) => {
        if (expedienteClinico.ok) {
          // Si el empleado ya tiene un expediente clínico, realiza una solicitud PUT
          return fetch(`${apiurl}/expedienteclinico/empleado/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(datosExpedienteClinico),
          });
        } else {
          // Si el empleado no tiene un expediente clínico, realiza una solicitud POST
          return fetch(`${apiurl}/expedienteclinico`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(datosExpedienteClinico),
          });
        }
      })
      .then((responseExpedienteClinico) => {
        if (!responseExpedienteClinico.ok) {
          throw new Error(
            `Error al enviar datos del expediente clínico: ${responseExpedienteClinico.status}`
          );
        }
        return responseExpedienteClinico.json();
      })
      .then((dataExpedienteClinico) => {
        console.log(
          "Respuesta del servidor (Expediente Clínico):",
          dataExpedienteClinico
        );
        // Resto de tu lógica para manejar la respuesta del servidor...
      })
      .catch((error) => {
        console.error(
          "Error en la solicitud POST/PUT (Expediente Clínico):",
          error
        );
        if (
          error instanceof TypeError &&
          error.message === "Failed to fetch"
        ) {
          console.error(
            "Posibles problemas de CORS o el servidor no está en ejecución."
          );
        }
      });
  };

export const cargarExpedienteClinicoPorEmpleado = async (empleadoId) => {
    try {
      const response = await fetch(`${apiurl}/expedienteclinico/empleado/${empleadoId}`, {
        method: 'GET',
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
      if (!response.ok) {
        throw new Error(`Error al cargar datos de expediente clínico: ${response.status}`);
      }
      const json = await response.json();
      if (!json || !Array.isArray(json) || json.length === 0) {
        return null;
      }
  
      const expedienteClinicoData = json[0]; // Tomar el primer objeto del array
      return {
        tipoSangre: expedienteClinicoData.tipoSangre,
        Padecimientos: expedienteClinicoData.Padecimientos,
        NumeroSeguroSocial: expedienteClinicoData.NumeroSeguroSocial,
        Datossegurodegastos: expedienteClinicoData.Segurodegastosmedicos,
        PDFSegurodegastosmedicos: expedienteClinicoData.PDFSegurodegastosmedicos || null,
      };
    } catch (error) {
      throw new Error(`Error al cargar expediente clínico: ${error}`);
    }
  };