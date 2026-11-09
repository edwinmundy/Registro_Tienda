// Plantillas iniciales de Checklist.xlsx y agenda de Agenda_Diaria_GET.pptx.
// Se copian al almacenamiento solo en el primer uso.
const CHECKLIST_PLANTILLAS_INICIALES = [
  {
    "id": "semanal",
    "nombre": "SEMANAL",
    "turnos": 3,
    "descripcion": "Actividades de la hoja SEMANAL del checklist de tienda.",
    "actividades": [
      {
        "id": "semanal-6",
        "categoria": "MÁQUINAS DE CAFÉ",
        "actividad": "Get it: recirculación",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "semanal-7",
        "categoria": "MÁQUINAS DE CAFÉ",
        "actividad": "Get It 1 limpieza profunda",
        "horario": "",
        "frecuencia": "2/semana"
      },
      {
        "id": "semanal-8",
        "categoria": "MÁQUINAS DE CAFÉ",
        "actividad": "Get It 2 limpieza profunda",
        "horario": "",
        "frecuencia": "2/semana"
      },
      {
        "id": "semanal-9",
        "categoria": "MÁQUINAS DE CAFÉ",
        "actividad": "Leche liquida 1 limpieza profunda",
        "horario": "",
        "frecuencia": "2/semana"
      },
      {
        "id": "semanal-10",
        "categoria": "MÁQUINAS DE CAFÉ",
        "actividad": "Leche liquida 2 limpieza profunda",
        "horario": "",
        "frecuencia": "2/semana"
      },
      {
        "id": "semanal-11",
        "categoria": "PANADERÍA",
        "actividad": "Saladette ( limpieza Profunda)",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "semanal-12",
        "categoria": "PANADERÍA",
        "actividad": "Nevera centro( limpieza Profunda)",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "semanal-13",
        "categoria": "PANADERÍA",
        "actividad": "Neveras 3 (limpieza profunda)",
        "horario": "",
        "frecuencia": "Semanal"
      },
      {
        "id": "semanal-14",
        "categoria": "PANADERÍA",
        "actividad": "Saladette 2( limpieza Profunda)",
        "horario": "",
        "frecuencia": "Semanal"
      },
      {
        "id": "semanal-15",
        "categoria": "PANADERÍA",
        "actividad": "Limpieza neveras breden",
        "horario": "",
        "frecuencia": "Semanal"
      },
      {
        "id": "semanal-16",
        "categoria": "PANADERÍA",
        "actividad": "Limpiar congelador de atrás",
        "horario": "",
        "frecuencia": "Semanal"
      },
      {
        "id": "semanal-17",
        "categoria": "PANADERÍA",
        "actividad": "Limpiar horno de Breden",
        "horario": "",
        "frecuencia": "Semanal"
      },
      {
        "id": "semanal-18",
        "categoria": "PANADERÍA",
        "actividad": "Limpiar Merrychef",
        "horario": "",
        "frecuencia": "Semanal"
      },
      {
        "id": "semanal-19",
        "categoria": "PANADERÍA",
        "actividad": "Limpiar toda area de panaderia cocina electrica etc",
        "horario": "",
        "frecuencia": "Semanal"
      },
      {
        "id": "semanal-20",
        "categoria": "PANADERÍA",
        "actividad": "Orden del area de panadería",
        "horario": "",
        "frecuencia": "Semanal"
      },
      {
        "id": "semanal-21",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpiar las mesas afuera del local",
        "horario": "",
        "frecuencia": "Semanal"
      },
      {
        "id": "semanal-22",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpiar piso frente al local",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "semanal-23",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpiar bases de hierro y sintras",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "semanal-24",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Sacar basura y reponer la bolsa para cada pote",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "semanal-25",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpieza profunda de los baño de GET IT",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "semanal-26",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpieza de escritorio y piso de bodega",
        "horario": "",
        "frecuencia": ""
      },
      {
        "id": "semanal-27",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpieza de vidrios de neveras en tienda y nevera de helados",
        "horario": "",
        "frecuencia": ""
      },
      {
        "id": "semanal-28",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpieza de Puertas de acceso y vidrios",
        "horario": "",
        "frecuencia": "Semanal"
      },
      {
        "id": "semanal-29",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer neveras Bebidas carbonatadas,aguas, jugos, energeticas",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "semanal-30",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer neveras Helados y congelados",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "semanal-31",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer neveras de licores, cervezas, cecinas y quesos",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "semanal-32",
        "categoria": "REPOSICIÓN",
        "actividad": "Reposicion área de bebidas alcolicas",
        "horario": "",
        "frecuencia": "Semanal"
      },
      {
        "id": "semanal-33",
        "categoria": "REPOSICIÓN",
        "actividad": "Reposicion gondola 1 chocolates",
        "horario": "",
        "frecuencia": ""
      },
      {
        "id": "semanal-34",
        "categoria": "REPOSICIÓN",
        "actividad": "Reposicion gondola 2 galletas y masas dulces",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "semanal-35",
        "categoria": "REPOSICIÓN",
        "actividad": "Reposicion gondola 3 galletas saludables y barras de proteinas",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "semanal-36",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer góndolas de area de entrada (café y productos koreanos)",
        "horario": "",
        "frecuencia": ""
      },
      {
        "id": "semanal-37",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer área de snacks, despensa y panadería",
        "horario": "",
        "frecuencia": ""
      },
      {
        "id": "semanal-38",
        "categoria": "REPOSICIÓN",
        "actividad": "Etiquetar precios en gondolas (cada vez que aplique)",
        "horario": "",
        "frecuencia": ""
      },
      {
        "id": "semanal-39",
        "categoria": "REPOSICIÓN",
        "actividad": "Verificar fechas de vencimientos de los prodcutos con vida corta",
        "horario": "",
        "frecuencia": ""
      },
      {
        "id": "semanal-40",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer cigarros y tabacos",
        "horario": "",
        "frecuencia": ""
      },
      {
        "id": "semanal-41",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer helados nevera savory",
        "horario": "",
        "frecuencia": ""
      },
      {
        "id": "semanal-42",
        "categoria": "REPOSICIÓN",
        "actividad": "Revisión de stock en depósito para reposición exaustiva de Góndolas",
        "horario": "",
        "frecuencia": "3 /semana"
      },
      {
        "id": "semanal-43",
        "categoria": "INVENTARIO",
        "actividad": "Hacer inventario cigarros en sala de ventas",
        "horario": "",
        "frecuencia": "Semanal"
      },
      {
        "id": "semanal-44",
        "categoria": "INVENTARIO",
        "actividad": "Hacer inventario cigarros en bodega",
        "horario": "",
        "frecuencia": ""
      },
      {
        "id": "semanal-45",
        "categoria": "INVENTARIO",
        "actividad": "Hacer inventario de Panadería",
        "horario": "",
        "frecuencia": ""
      },
      {
        "id": "semanal-46",
        "categoria": "INVENTARIO",
        "actividad": "Hacer inventario de Breden y Guaioio",
        "horario": "",
        "frecuencia": "Diario"
      }
    ]
  },
  {
    "id": "diario-2-turnos",
    "nombre": "DIARIO (2 TURNOS)",
    "turnos": 2,
    "descripcion": "Actividades de la hoja DIARIO (2 TURNOS) del checklist de tienda.",
    "actividades": [
      {
        "id": "diario-10",
        "categoria": "APERTURA",
        "actividad": "El turno que entrega reportar incidencias",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-11",
        "categoria": "APERTURA",
        "actividad": "Verificar disponibilidad de sencillo en la caja",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-12",
        "categoria": "APERTURA",
        "actividad": "Verificar que las aplicaciones (UBER, pedidos YA y Rappi ) esten Ok",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-13",
        "categoria": "APERTURA",
        "actividad": "Puntos Mercadopago-TLF con carga",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-14",
        "categoria": "APERTURA",
        "actividad": "Orden en Caja-Computadores y Meson",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-15",
        "categoria": "MAQUINA DE CAFÉ",
        "actividad": "Recirculación",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-16",
        "categoria": "MAQUINA DE CAFÉ",
        "actividad": "Recarga de ingredientes (R)",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-17",
        "categoria": "MAQUINA DE CAFÉ",
        "actividad": "DEJAR Vasos en área de caja y panadería",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-18",
        "categoria": "MAQUINA DE CAFÉ",
        "actividad": "DEJAR azucar, splenda y servilletas en área de café",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-19",
        "categoria": "MAQUINA DE CAFÉ",
        "actividad": "DEJAR Tapas en área de café",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-20",
        "categoria": "PANADERÍA",
        "actividad": "Saladette( limpieza y reposición)",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-21",
        "categoria": "PANADERÍA",
        "actividad": "Lavado Bandejas horno",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-22",
        "categoria": "PANADERÍA",
        "actividad": "Materia prima descongelada",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-23",
        "categoria": "PANADERÍA",
        "actividad": "Reponer Empanadas, muffin, donas, postres getit, cachitos, tequeños y pizzas (ojo mantener siempre repuesto siguiendo mínimo y máximo)",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-24",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpieza de baños",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-25",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpieza piso de panaderia",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-26",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Entrega paño de cocina limpios",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-27",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpieza en área de caja pisos y mesones",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-28",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Basura ordenada y cartones parte trasera",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-29",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpieza y orden de la bodega",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-30",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Entrega de trapero limpio",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-31",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Vidrios de puerta principal limpios",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-32",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpiar góndalas en salas de ventas y la estantería del depósito (según al cronograma por persona)",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-33",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "limpieza en área de terraza, pisos, sillas y mesas",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-34",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "limpieza en area de buffet, cafetería, mesas, sillas y piso",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-35",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "limpieza en área de vidrios y porcelanato de buffet",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-36",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Sacar basura y reponer la bolsa para cada pote",
        "horario": "",
        "frecuencia": "Interdiario"
      },
      {
        "id": "diario-37",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpieza área de totem y autoservicio",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-38",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Resguardo de los tachos de basura al pasar el aseo",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-39",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer neveras Bebidas carbonatadas,aguas, jugos, energeticas",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-40",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer neveras Helados y congelados",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-41",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer neveras de licores, cervezas, cecinas y quesos",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-42",
        "categoria": "REPOSICIÓN",
        "actividad": "Reposicion área de bebidas alcolicas",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-43",
        "categoria": "REPOSICIÓN",
        "actividad": "Reposicion gondola 1 chocolates",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-44",
        "categoria": "REPOSICIÓN",
        "actividad": "Reposicion gondola 2 galletas y masas dulces",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-45",
        "categoria": "REPOSICIÓN",
        "actividad": "Reposicion gondola 3 galletas saludables y barras de proteinas",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-46",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer góndolas de area de entrada (café y productos koreanos)",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-47",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer área de snacks, despensa y panadería",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-48",
        "categoria": "REPOSICIÓN",
        "actividad": "Etiquetar precios en gondolas (cada vez que aplique)",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-49",
        "categoria": "REPOSICIÓN",
        "actividad": "Verificar fechas de vencimientos de los prodcutos con vida corta",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-50",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer cigarros y tabacos",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-51",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer helados nevera savory",
        "horario": "",
        "frecuencia": "3 /semana"
      },
      {
        "id": "diario-52",
        "categoria": "REPOSICIÓN",
        "actividad": "Revisión de stock en depósito para reposición exaustiva de Góndolas",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-53",
        "categoria": "INVENTARIO",
        "actividad": "Hacer inventario cigarros en bodega",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-54",
        "categoria": "INVENTARIO",
        "actividad": "Hacer inventario cigarros en sala de ventas",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-55",
        "categoria": "INVENTARIO",
        "actividad": "Hacer inventario de tabacos y vaporizadores",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-56",
        "categoria": "INVENTARIO",
        "actividad": "Hacer inventario de Panadería",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-57",
        "categoria": "INVENTARIO",
        "actividad": "Apoyar en inventario general depende de la programacion",
        "horario": "",
        "frecuencia": "Diario"
      }
    ]
  },
  {
    "id": "diario-3-turnos",
    "nombre": "DIARIO (3 TURNOS)",
    "turnos": 3,
    "descripcion": "Actividades de la hoja DIARIO (3 TURNOS) del checklist de tienda.",
    "actividades": [
      {
        "id": "diario-10",
        "categoria": "APERTURA",
        "actividad": "El turno que entrega reportar incidencias",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-11",
        "categoria": "APERTURA",
        "actividad": "Verificar disponibilidad de sencillo en la caja",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-12",
        "categoria": "APERTURA",
        "actividad": "Verificar que las aplicaciones (UBER, pedidos YA y Rappi ) esten Ok",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-13",
        "categoria": "APERTURA",
        "actividad": "Puntos Mercadopago-TLF con carga",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-14",
        "categoria": "APERTURA",
        "actividad": "Orden en Caja-Computadores y Meson",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-15",
        "categoria": "MAQUINA DE CAFÉ",
        "actividad": "Recirculación",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-16",
        "categoria": "MAQUINA DE CAFÉ",
        "actividad": "Recarga de ingredientes (R)",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-17",
        "categoria": "MAQUINA DE CAFÉ",
        "actividad": "DEJAR Vasos en área de caja y panadería",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-18",
        "categoria": "MAQUINA DE CAFÉ",
        "actividad": "DEJAR azucar, splenda y servilletas en área de café",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-19",
        "categoria": "MAQUINA DE CAFÉ",
        "actividad": "DEJAR Tapas en área de café",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-20",
        "categoria": "PANADERÍA",
        "actividad": "Saladette( limpieza y reposición)",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-21",
        "categoria": "PANADERÍA",
        "actividad": "Lavado Bandejas horno",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-22",
        "categoria": "PANADERÍA",
        "actividad": "Materia prima descongelada",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-23",
        "categoria": "PANADERÍA",
        "actividad": "Reponer Empanadas, muffin, donas, postres getit, cachitos, tequeños y pizzas (ojo mantener siempre repuesto siguiendo mínimo y máximo)",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-24",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpieza de baños",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-25",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpieza piso de panaderia",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-26",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Entrega paño de cocina limpios",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-27",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpieza en área de caja pisos y mesones",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-28",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Basura ordenada y cartones parte trasera",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-29",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpieza y orden de la bodega",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-30",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Entrega de trapero limpio",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-31",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Vidrios de puerta principal limpios",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-32",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpiar góndalas en salas de ventas y la estantería del depósito (según al cronograma por persona)",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-33",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "limpieza en área de terraza, pisos, sillas y mesas",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-34",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "limpieza en area de buffet, cafetería, mesas, sillas y piso",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-35",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "limpieza en área de vidrios y porcelanato de buffet",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-36",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Sacar basura y reponer la bolsa para cada pote",
        "horario": "",
        "frecuencia": "Interdiario"
      },
      {
        "id": "diario-37",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Limpieza área de totem y autoservicio",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-38",
        "categoria": "ORDEN Y LIMPIEZA",
        "actividad": "Resguardo de los tachos de basura al pasar el aseo",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-39",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer neveras Bebidas carbonatadas,aguas, jugos, energeticas",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-40",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer neveras Helados y congelados",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-41",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer neveras de licores, cervezas, cecinas y quesos",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-42",
        "categoria": "REPOSICIÓN",
        "actividad": "Reposicion área de bebidas alcolicas",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-43",
        "categoria": "REPOSICIÓN",
        "actividad": "Reposicion gondola 1 chocolates",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-44",
        "categoria": "REPOSICIÓN",
        "actividad": "Reposicion gondola 2 galletas y masas dulces",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-45",
        "categoria": "REPOSICIÓN",
        "actividad": "Reposicion gondola 3 galletas saludables y barras de proteinas",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-46",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer góndolas de area de entrada (café y productos koreanos)",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-47",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer área de snacks, despensa y panadería",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-48",
        "categoria": "REPOSICIÓN",
        "actividad": "Etiquetar precios en gondolas (cada vez que aplique)",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-49",
        "categoria": "REPOSICIÓN",
        "actividad": "Verificar fechas de vencimientos de los prodcutos con vida corta",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-50",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer cigarros y tabacos",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-51",
        "categoria": "REPOSICIÓN",
        "actividad": "Reponer helados nevera savory",
        "horario": "",
        "frecuencia": "3 /semana"
      },
      {
        "id": "diario-52",
        "categoria": "REPOSICIÓN",
        "actividad": "Revisión de stock en depósito para reposición exaustiva de Góndolas",
        "horario": "",
        "frecuencia": "Continuo"
      },
      {
        "id": "diario-53",
        "categoria": "INVENTARIO",
        "actividad": "Hacer inventario cigarros en bodega",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-54",
        "categoria": "INVENTARIO",
        "actividad": "Hacer inventario cigarros en sala de ventas",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-55",
        "categoria": "INVENTARIO",
        "actividad": "Hacer inventario de tabacos y vaporizadores",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-56",
        "categoria": "INVENTARIO",
        "actividad": "Hacer inventario de Panadería",
        "horario": "",
        "frecuencia": "Diario"
      },
      {
        "id": "diario-57",
        "categoria": "INVENTARIO",
        "actividad": "Apoyar en inventario general depende de la programacion",
        "horario": "",
        "frecuencia": "Diario"
      }
    ]
  }
];

const CHECKLIST_AGENDA = {
  "sucursal": "Almirante Pastene 096",
  "turnos": [
    {
      "nombre": "Mañana",
      "horario": "07:00–15:00",
      "bloques": [
        {
          "horario": "7:00–8:00",
          "actividad": "Apertura y Abastecimiento",
          "responsabilidad": "Revise el stock de materia prima y avise de inmediato si falta algo."
        },
        {
          "horario": "8:00–9:00",
          "actividad": "Reposición de nevera y góndolas",
          "responsabilidad": "Mantenga su espacio repuesto y limpio; registre cada paquete nuevo que abra."
        },
        {
          "horario": "9:00–10:00",
          "actividad": "Limpieza de Máquinas de Café",
          "responsabilidad": "Limpie las 3 máquinas, reponga insumos y registre lo utilizado."
        },
        {
          "horario": "10:00–11:00",
          "actividad": "Ordenamiento del almacén",
          "responsabilidad": "Ordenar el área de bodega bajo el planograma que estipule la tienda."
        },
        {
          "horario": "11:00–12:00",
          "actividad": "Orden y Limpieza (Obligatorio)",
          "responsabilidad": "Retire la basura, barra y trapee su espacio antes de continuar."
        },
        {
          "horario": "12:00–13:00",
          "actividad": "Reabastecimiento e Inventarios de cigarros (Obligatorio)",
          "responsabilidad": "Traspase los registros a los inventarios; el control es su responsabilidad directa."
        },
        {
          "horario": "13:00–14:00",
          "actividad": "Elaboración y Despacho",
          "responsabilidad": "Continúe con la elaboración y despacho de productos."
        },
        {
          "horario": "14:00–15:00",
          "actividad": "Entrega de Turno",
          "responsabilidad": "Reciba a su compañero, entregue los detalles y comunique los pendientes."
        }
      ]
    },
    {
      "nombre": "Tarde",
      "horario": "14:30–22:30",
      "bloques": [
        {
          "horario": "14:30–15:30",
          "actividad": "Apertura y Abastecimiento",
          "responsabilidad": "Revise el stock de materia prima y avise de inmediato si falta algo."
        },
        {
          "horario": "15:30–16:30",
          "actividad": "Reposición de nevera y góndolas",
          "responsabilidad": "Mantenga su espacio repuesto y limpio; registre cada paquete nuevo que abra."
        },
        {
          "horario": "16:30–17:30",
          "actividad": "Limpieza de Máquinas de Café",
          "responsabilidad": "Limpie las 3 máquinas, reponga insumos y registre lo utilizado."
        },
        {
          "horario": "17:30–18:30",
          "actividad": "Ordenamiento del almacén",
          "responsabilidad": "Ordenar el área de bodega bajo el planograma que estipule la tienda."
        },
        {
          "horario": "18:30–19:30",
          "actividad": "Orden y Limpieza (Obligatorio)",
          "responsabilidad": "Retire la basura, barra y trapee su espacio antes de continuar."
        },
        {
          "horario": "19:30–20:30",
          "actividad": "Reabastecimiento de saladette e Inventarios de cigarros ",
          "responsabilidad": "Traspase los registros a los inventarios; el control es su responsabilidad directa."
        },
        {
          "horario": "20:30–21:30",
          "actividad": "Elaboración y Despacho",
          "responsabilidad": "Continúe con la elaboración y despacho de productos."
        },
        {
          "horario": "21:30–22:30",
          "actividad": "Entrega de Turno",
          "responsabilidad": "Reciba a su compañero, entregue los detalles y comunique los pendientes."
        }
      ]
    },
    {
      "nombre": "Noche",
      "horario": "22:30–07:00",
      "bloques": [
        {
          "horario": "22:30–23:30",
          "actividad": "Apertura y Abastecimiento",
          "responsabilidad": "Revise el stock de materia prima y avise de inmediato si falta algo."
        },
        {
          "horario": "23:30–00:30",
          "actividad": "Reposición de nevera y góndolas",
          "responsabilidad": "Mantenga su espacio repuesto y limpio; registre cada paquete nuevo que abra."
        },
        {
          "horario": "00:30–01:30",
          "actividad": "Limpieza de Máquinas de Café",
          "responsabilidad": "Limpie las 3 máquinas, reponga insumos y registre lo utilizado."
        },
        {
          "horario": "01:30–02:30",
          "actividad": "Ordenamiento del almacén",
          "responsabilidad": "Ordenar el área de bodega bajo el planograma que estipule la tienda."
        },
        {
          "horario": "02:30–03:30",
          "actividad": "Orden y Limpieza (Obligatorio)",
          "responsabilidad": "Retire la basura, barra y trapee su espacio antes de continuar."
        },
        {
          "horario": "03:30–04:30",
          "actividad": "Reabastecimiento de saladette e Inventarios de cigarros ",
          "responsabilidad": "Traspase los registros a los inventarios; el control es su responsabilidad directa."
        },
        {
          "horario": "04:30–05:30",
          "actividad": "Elaboración y Despacho",
          "responsabilidad": "Continúe con la elaboración y despacho de productos."
        },
        {
          "horario": "05:30–07:00",
          "actividad": "Entrega de Turno",
          "responsabilidad": "Reciba a su compañero, entregue los detalles y comunique los pendientes."
        }
      ]
    }
  ],
  "recordatorios": [
    {
      "titulo": "Comunicación Inmediata",
      "descripcion": "Avise de inmediato a sus compañeros cualquier producto sin stock, para evitar ofrecer o vender artículos que no están disponibles."
    },
    {
      "titulo": "Limpieza de Espacio",
      "descripcion": "Orden, basura, bolsa, barrido y trapeado de su espacio. El trapero se lava y se deja limpio. Obligatorio en cada turno."
    },
    {
      "titulo": "Control de Inventarios y reposición",
      "descripcion": "Traspase los datos anotados a los inventarios correspondientes y reponer la mercadería en sala de ventas. Es exclusiva responsabilidad de quien está en el área; será supervisado."
    },
    {
      "titulo": "Boletas Claras y Completas",
      "descripcion": "Exija a caja información clara y escrita: caliente o frío, para servir o llevar, con o sin salsa (cuál), y siempre con el nombre del cliente."
    }
  ]
};
