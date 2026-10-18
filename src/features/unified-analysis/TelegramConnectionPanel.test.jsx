import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import TelegramConnectionPanel from './TelegramConnectionPanel';
import * as api from '../../api/portfolioApi';
vi.mock('../../api/portfolioApi');
beforeEach(() => vi.resetAllMocks());
it('연결 확인은 클릭할 때만 실행하며 발송하지 않는다', async () => {
  api.checkTelegramConnection.mockResolvedValue({ state: 'VERIFIED', message: '봇 인증 확인', botUsername: 'stocks_bot', automaticDeliveryEnabled: false });
  render(<TelegramConnectionPanel enabled />);
  expect(api.checkTelegramConnection).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '봇 인증·대화방 확인' }));
  expect(await screen.findByText(/자동 알림 꺼짐/)).toBeInTheDocument();
  expect(api.checkTelegramConnection).toHaveBeenCalledTimes(1);expect(api.sendTelegramTest).not.toHaveBeenCalled();
});
it('운영 기능이 꺼져 있으면 연결 안내만 제공한다', () => {
  render(<TelegramConnectionPanel enabled={false} />);
  expect(screen.getByRole('button', { name: '봇 인증·대화방 확인' })).toBeDisabled();
  expect(api.checkTelegramConnection).not.toHaveBeenCalled();
});
it('확인 실패를 정상 연결로 표시하지 않는다', async () => {
  api.checkTelegramConnection.mockResolvedValue({ state: 'CHAT_UNAVAILABLE', message: '대화방 ID를 확인하세요.', automaticDeliveryEnabled: false });
  render(<TelegramConnectionPanel enabled />);
  fireEvent.click(screen.getByRole('button', { name: '봇 인증·대화방 확인' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('대화방 ID를 확인하세요.');
});
