'use client'

import { ModuleRegistry } from '@ag-grid-community/core'
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model'
import { AgGridReact, AgGridReactProps } from '@ag-grid-community/react'
import '@ag-grid-community/styles/ag-grid.css'
import '@ag-grid-community/styles/ag-theme-quartz.css'

ModuleRegistry.registerModules([ClientSideRowModelModule])

interface AgGridDarkProps extends AgGridReactProps {
  wrapperClassName?: string
}

export function AgGridDark({ wrapperClassName, ...props }: AgGridDarkProps) {
  return (
    <div className={`ag-theme-quartz-dark w-full ${wrapperClassName ?? ''}`}>
      <AgGridReact
        domLayout="autoHeight"
        {...props}
      />
    </div>
  )
}
