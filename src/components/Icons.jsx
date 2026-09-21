/* Set de iconos en SVG inline: heredan color y tamaño del contexto,
   así que se ven bien en el rail oscuro y en las tablas claras. */

function Svg({ size = 16, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconBox = (p) => (
  <Svg {...p}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
  </Svg>
)

export const IconExchange = (p) => (
  <Svg {...p}>
    <path d="m16 3 4 4-4 4" />
    <path d="M20 7H4" />
    <path d="m8 21-4-4 4-4" />
    <path d="M4 17h16" />
  </Svg>
)

export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
)

export const IconX = (p) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
)

export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const IconPencil = (p) => (
  <Svg {...p}>
    <path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </Svg>
)

export const IconTrash = (p) => (
  <Svg {...p}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6M14 11v6" />
  </Svg>
)

export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="m20 6-11 11-5-5" />
  </Svg>
)

export const IconCheckCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </Svg>
)

export const IconAlert = (p) => (
  <Svg {...p}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </Svg>
)

export const IconInfo = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4M12 8h.01" />
  </Svg>
)

export const IconArrowUp = (p) => (
  <Svg {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Svg>
)

export const IconArrowDownCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8.5 12.5 12 16l3.5-3.5" />
  </Svg>
)

export const IconArrowUpCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16V8M8.5 11.5 12 8l3.5 3.5" />
  </Svg>
)

export const IconLayers = (p) => (
  <Svg {...p}>
    <path d="m12 2 9 5-9 5-9-5Z" />
    <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
  </Svg>
)

export const IconCoins = (p) => (
  <Svg {...p}>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
    <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </Svg>
)

export const IconActivity = (p) => (
  <Svg {...p}>
    <path d="M3 12h4l3 8 4-16 3 8h4" />
  </Svg>
)

export const IconInbox = (p) => (
  <Svg {...p}>
    <path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6" />
    <path d="M3 12h5l1.5 2.5h5L16 12h5l-3-7H6Z" />
  </Svg>
)

export const IconSun = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
)

export const IconMoon = (p) => (
  <Svg {...p}>
    <path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z" />
  </Svg>
)
