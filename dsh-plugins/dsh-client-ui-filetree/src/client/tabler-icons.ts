/** Typed wrapper for the @tabler/icons-react per-icon ESM modules we use.
 *  Each .mjs ships no adjacent type declarations, so the import is suppressed
 *  and cast to our structural icon component type (tsdown/rolldown still
 *  resolves and bundles the real .mjs — tree-shaken to exactly these icons). */
import type { ReactNode } from 'react'

export interface TablerIconProps {
  size?: number | string
  color?: string
  stroke?: number | string
  className?: string
}

export type TablerIcon = (props: TablerIconProps) => ReactNode

// @ts-expect-error per-icon .mjs ships no adjacent types
import IconBracesRaw from '@tabler/icons-react/dist/esm/icons/IconBraces.mjs'
export const IconBraces: TablerIcon = IconBracesRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconChevronsDownRaw from '@tabler/icons-react/dist/esm/icons/IconChevronsDown.mjs'
export const IconChevronsDown: TablerIcon = IconChevronsDownRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconChevronsUpRaw from '@tabler/icons-react/dist/esm/icons/IconChevronsUp.mjs'
export const IconChevronsUp: TablerIcon = IconChevronsUpRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconDatabaseRaw from '@tabler/icons-react/dist/esm/icons/IconDatabase.mjs'
export const IconDatabase: TablerIcon = IconDatabaseRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileRaw from '@tabler/icons-react/dist/esm/icons/IconFile.mjs'
export const IconFile: TablerIcon = IconFileRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileAlertRaw from '@tabler/icons-react/dist/esm/icons/IconFileAlert.mjs'
export const IconFileAlert: TablerIcon = IconFileAlertRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileCodeRaw from '@tabler/icons-react/dist/esm/icons/IconFileCode.mjs'
export const IconFileCode: TablerIcon = IconFileCodeRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileCode2Raw from '@tabler/icons-react/dist/esm/icons/IconFileCode2.mjs'
export const IconFileCode2: TablerIcon = IconFileCode2Raw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileInfoRaw from '@tabler/icons-react/dist/esm/icons/IconFileInfo.mjs'
export const IconFileInfo: TablerIcon = IconFileInfoRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileMusicRaw from '@tabler/icons-react/dist/esm/icons/IconFileMusic.mjs'
export const IconFileMusic: TablerIcon = IconFileMusicRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTextRaw from '@tabler/icons-react/dist/esm/icons/IconFileText.mjs'
export const IconFileText: TablerIcon = IconFileTextRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypeBmpRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypeBmp.mjs'
export const IconFileTypeBmp: TablerIcon = IconFileTypeBmpRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypeCssRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypeCss.mjs'
export const IconFileTypeCss: TablerIcon = IconFileTypeCssRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypeCsvRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypeCsv.mjs'
export const IconFileTypeCsv: TablerIcon = IconFileTypeCsvRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypeDocRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypeDoc.mjs'
export const IconFileTypeDoc: TablerIcon = IconFileTypeDocRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypeHtmlRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypeHtml.mjs'
export const IconFileTypeHtml: TablerIcon = IconFileTypeHtmlRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypeJsRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypeJs.mjs'
export const IconFileTypeJs: TablerIcon = IconFileTypeJsRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypeJpgRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypeJpg.mjs'
export const IconFileTypeJpg: TablerIcon = IconFileTypeJpgRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypeJsxRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypeJsx.mjs'
export const IconFileTypeJsx: TablerIcon = IconFileTypeJsxRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypePdfRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypePdf.mjs'
export const IconFileTypePdf: TablerIcon = IconFileTypePdfRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypePhpRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypePhp.mjs'
export const IconFileTypePhp: TablerIcon = IconFileTypePhpRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypePngRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypePng.mjs'
export const IconFileTypePng: TablerIcon = IconFileTypePngRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypeSqlRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypeSql.mjs'
export const IconFileTypeSql: TablerIcon = IconFileTypeSqlRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypeSvgRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypeSvg.mjs'
export const IconFileTypeSvg: TablerIcon = IconFileTypeSvgRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypeTsRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypeTs.mjs'
export const IconFileTypeTs: TablerIcon = IconFileTypeTsRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypeTxtRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypeTxt.mjs'
export const IconFileTypeTxt: TablerIcon = IconFileTypeTxtRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypeVueRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypeVue.mjs'
export const IconFileTypeVue: TablerIcon = IconFileTypeVueRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypeXlsRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypeXls.mjs'
export const IconFileTypeXls: TablerIcon = IconFileTypeXlsRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypeXmlRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypeXml.mjs'
export const IconFileTypeXml: TablerIcon = IconFileTypeXmlRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconFileTypeZipRaw from '@tabler/icons-react/dist/esm/icons/IconFileTypeZip.mjs'
export const IconFileTypeZip: TablerIcon = IconFileTypeZipRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconKeyRaw from '@tabler/icons-react/dist/esm/icons/IconKey.mjs'
export const IconKey: TablerIcon = IconKeyRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconLockRaw from '@tabler/icons-react/dist/esm/icons/IconLock.mjs'
export const IconLock: TablerIcon = IconLockRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconPhotoRaw from '@tabler/icons-react/dist/esm/icons/IconPhoto.mjs'
export const IconPhoto: TablerIcon = IconPhotoRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconSettingsRaw from '@tabler/icons-react/dist/esm/icons/IconSettings.mjs'
export const IconSettings: TablerIcon = IconSettingsRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconTerminal2Raw from '@tabler/icons-react/dist/esm/icons/IconTerminal2.mjs'
export const IconTerminal2: TablerIcon = IconTerminal2Raw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconVideoRaw from '@tabler/icons-react/dist/esm/icons/IconVideo.mjs'
export const IconVideo: TablerIcon = IconVideoRaw
// @ts-expect-error per-icon .mjs ships no adjacent types
import IconArrowsDiffRaw from '@tabler/icons-react/dist/esm/icons/IconArrowsDiff.mjs'
export const IconArrowsDiff: TablerIcon = IconArrowsDiffRaw
