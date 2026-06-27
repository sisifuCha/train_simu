import { useMessage } from 'naive-ui'

/**
 * 统一的全局消息反馈入口。
 * 必须在 n-message-provider 内的组件 setup 中调用。
 *
 * 用法：
 *   const { notify, message } = useNotify()
 *   const res = interlocking.establishRoute(id)   // res = { success, message }
 *   notify(res)                                   // 自动弹绿/红消息条
 */
export function useNotify() {
  const message = useMessage()

  // 根据 store 返回的 { success, message } 弹出对应颜色的全局消息条，返回是否成功
  function notify(res) {
    if (!res) return false
    if (res.success) {
      message.success(res.message)
    } else {
      message.error(res.message)
    }
    return res.success
  }

  // 直接弹各类消息
  const ok    = (msg) => message.success(msg)
  const err   = (msg) => message.error(msg)
  const warn  = (msg) => message.warning(msg)
  const info  = (msg) => message.info(msg)

  return { message, notify, ok, err, warn, info }
}
