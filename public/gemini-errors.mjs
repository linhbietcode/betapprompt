export const DEFAULT_GEMINI_MODEL='gemini-3.5-flash-lite';
export function geminiDiagnostic(raw,status,key=''){
  const failure=raw?.error&&typeof raw.error==='object'?raw.error:{};
  let message=String(failure.message??'');
  if(key)message=message.split(key).join('[khóa đã ẩn]');
  message=message.replace(/AIza[\w-]+/g,'[khóa đã ẩn]').slice(0,500);
  const reason=String(failure.details?.find(x=>x.reason)?.reason??failure.status??'').replace(/[^A-Z0-9_]/g,'').slice(0,100);
  return {error:'gemini_request_failed',upstreamStatus:status,reason,message};
}
export function geminiFailure(data){return Object.assign(new Error(data.error??'gemini_unavailable'),{diagnostic:data});}
export function geminiErrorText(error){
  const d=error?.diagnostic??{error:error?.message};
  let title;
  if(d.error==='gemini_not_configured'||d.error==='not-configured')title='Chưa cấu hình Gemini. Điền khóa trong gemini.env rồi khởi động lại máy chủ.';
  else if(/API_KEY_INVALID|API_KEY_EXPIRED/.test(d.reason??''))title='Google không chấp nhận khóa API. Kiểm tra khóa trong Google AI Studio.';
  else if(d.reason==='FAILED_PRECONDITION'&&/location.*not supported/i.test(d.message??''))title=d.connection==='server'?'Google từ chối khu vực kết nối máy chủ. Kiểm tra VPN/proxy hoặc thử mạng khác; nếu triển khai online, kiểm tra khu vực hosting.':'Google từ chối khu vực của kết nối hiện tại. Nếu bạn đang ở khu vực được hỗ trợ, kiểm tra VPN/proxy hoặc thử mạng khác.';
  else if(d.upstreamStatus===429)title='Gemini đã chạm hạn mức của dự án. Kiểm tra quota trong Google AI Studio; tạo khóa khác trong cùng dự án không tăng hạn mức.';
  else if(d.upstreamStatus===404)title='Model chưa có hoặc chưa được cấp quyền cho dự án này. Kiểm tra GEMINI_MODEL trong gemini.env rồi khởi động lại máy chủ.';
  else if(d.upstreamStatus===403)title='Google từ chối quyền truy cập. Kiểm tra giới hạn của khóa và quyền dùng Gemini của dự án.';
  else if(d.upstreamStatus===400)title='Google từ chối yêu cầu. Xem thông báo bên dưới để kiểm tra khóa hoặc cấu hình model.';
  else if(d.error==='too_many_requests')title='Bạn đã gửi nhiều yêu cầu liên tiếp. Đợi một phút rồi thử lại.';
  else if(d.error==='gemini_invalid_result')title='Gemini trả về bộ phối ngoài danh mục hoặc JSON chưa hợp lệ. Thử gợi ý lại.';
  else if(d.error==='gemini_blocked_result')title='Gemini không trả nội dung cho yêu cầu này. Thử mô tả lại.';
  else if(d.error==='gemini_timeout'||['AbortError','TimeoutError'].includes(error?.name))title='Gemini phản hồi quá lâu. Thử lại sau một lát.';
  else title='Chưa kết nối được Gemini. Kiểm tra mạng rồi thử lại.';
  const detail=[d.upstreamStatus?`Google HTTP ${d.upstreamStatus}`:'',d.reason,d.message].filter(Boolean).join(' · ');
  return {title,detail};
}
